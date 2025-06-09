"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryService = void 0;
const electron_1 = require("electron");
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs-extra"));
const events_1 = require("events");
const zlib_1 = require("zlib");
const util_1 = require("util");
const EmbeddingService_1 = require("./EmbeddingService");
const VectorStoreService_1 = require("./VectorStoreService");
const logger_1 = require("../utils/logger");
const gzipAsync = (0, util_1.promisify)(zlib_1.gzip);
const unzipAsync = (0, util_1.promisify)(zlib_1.unzip);
class MemoryService extends events_1.EventEmitter {
    constructor() {
        super();
        this.isInitialized = false;
        this.db = null;
        this.cache = new Map();
        this.CACHE_SIZE = 1000;
        this.COMPRESSION_THRESHOLD = 1024; // 1KB
        this.DEFAULT_EXPIRY = 30 * 24 * 60 * 60 * 1000; // 30 days
        this.IMPORTANCE_DECAY = 0.95; // 5% decay per day
        this.embeddingService = EmbeddingService_1.EmbeddingService.getInstance();
        this.vectorStore = VectorStoreService_1.VectorStoreService.getInstance();
    }
    static getInstance() {
        if (!MemoryService.instance) {
            MemoryService.instance = new MemoryService();
        }
        return MemoryService.instance;
    }
    async initialize() {
        try {
            if (this.isInitialized) {
                return { success: true };
            }
            const dbPath = path.join(electron_1.app.getPath('userData'), 'memory.db');
            this.db = new better_sqlite3_1.default(dbPath);
            // Create tables with enhanced schema
            this.db.exec(`
        CREATE TABLE IF NOT EXISTS memories (
          id TEXT PRIMARY KEY,
          content TEXT,
          metadata TEXT,
          embedding BLOB,
          created_at INTEGER,
          updated_at INTEGER,
          importance REAL DEFAULT 1.0,
          expires_at INTEGER,
          compressed BOOLEAN DEFAULT FALSE
        );
        
        CREATE INDEX IF NOT EXISTS idx_memories_metadata 
          ON memories(metadata);
        
        CREATE INDEX IF NOT EXISTS idx_memories_timestamp 
          ON memories(created_at);
        
        CREATE INDEX IF NOT EXISTS idx_memories_importance 
          ON memories(importance);
        
        CREATE INDEX IF NOT EXISTS idx_memories_expires 
          ON memories(expires_at);
      `);
            // Start maintenance tasks
            this.startMaintenanceTasks();
            this.isInitialized = true;
            this.emit('initialized');
            return { success: true };
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize memory service:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to initialize memory service'
            };
        }
    }
    startMaintenanceTasks() {
        // Clean expired memories every hour
        setInterval(() => this.cleanExpiredMemories(), 60 * 60 * 1000);
        // Update importance scores daily
        setInterval(() => this.updateImportanceScores(), 24 * 60 * 60 * 1000);
        // Prune low-importance memories weekly
        setInterval(() => this.pruneLowImportanceMemories(), 7 * 24 * 60 * 60 * 1000);
    }
    async cleanExpiredMemories() {
        if (!this.db)
            return;
        const stmt = this.db.prepare(`
      DELETE FROM memories 
      WHERE expires_at IS NOT NULL AND expires_at < ?
    `);
        try {
            const result = stmt.run(Date.now());
            if (result.changes > 0) {
                this.emit('pruned', result.changes);
            }
        }
        catch (error) {
            logger_1.logger.error('Error cleaning expired memories:', error);
        }
    }
    async updateImportanceScores() {
        if (!this.db)
            return;
        const stmt = this.db.prepare(`
      UPDATE memories 
      SET importance = importance * ?
      WHERE expires_at IS NULL OR expires_at > ?
    `);
        try {
            stmt.run(this.IMPORTANCE_DECAY, Date.now());
        }
        catch (error) {
            logger_1.logger.error('Error updating importance scores:', error);
        }
    }
    async pruneLowImportanceMemories() {
        if (!this.db)
            return;
        const stmt = this.db.prepare(`
      DELETE FROM memories 
      WHERE importance < 0.1 
      AND (expires_at IS NULL OR expires_at > ?)
    `);
        try {
            const result = stmt.run(Date.now());
            if (result.changes > 0) {
                this.emit('pruned', result.changes);
            }
        }
        catch (error) {
            logger_1.logger.error('Error pruning low importance memories:', error);
        }
    }
    async store(chunk) {
        if (!this.isInitialized || !this.db) {
            throw new Error('Memory service not initialized');
        }
        // Generate embedding if not provided
        if (!chunk.vector) {
            chunk.vector = await this.embeddingService.generateEmbedding(chunk.content);
        }
        // Calculate importance score
        const importance = this.calculateImportance(chunk);
        // Determine if content should be compressed
        const shouldCompress = chunk.content.length > this.COMPRESSION_THRESHOLD;
        const content = shouldCompress ?
            (await gzipAsync(Buffer.from(chunk.content))).toString('base64') :
            chunk.content;
        const stmt = this.db.prepare(`
      INSERT INTO memories (
        id, content, metadata, embedding, created_at, updated_at, 
        importance, expires_at, compressed
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        try {
            stmt.run(chunk.id, content, JSON.stringify(chunk.metadata), new Float64Array(chunk.vector).buffer, Date.now(), Date.now(), importance, chunk.expiresAt || null, shouldCompress);
            // Update cache
            this.updateCache(chunk);
            this.emit('stored', chunk);
        }
        catch (error) {
            logger_1.logger.error('Error storing memory:', error);
            throw error;
        }
    }
    calculateImportance(chunk) {
        let importance = 1.0;
        // Adjust based on metadata
        if (chunk.metadata.importance) {
            importance *= chunk.metadata.importance;
        }
        // Adjust based on content length
        const contentLength = chunk.content.length;
        if (contentLength > 1000) {
            importance *= 1.2; // Longer content might be more important
        }
        // Adjust based on tags
        if (chunk.metadata.tags?.length) {
            importance *= (1 + (chunk.metadata.tags.length * 0.1));
        }
        return Math.min(importance, 10.0); // Cap at 10
    }
    updateCache(chunk) {
        if (this.cache.size >= this.CACHE_SIZE) {
            // Remove least recently used item
            const oldestKey = this.cache.keys().next().value;
            this.cache.delete(oldestKey);
        }
        this.cache.set(chunk.id, chunk);
    }
    async search(query, options = {}) {
        if (!this.isInitialized || !this.db) {
            throw new Error('Memory service not initialized');
        }
        const { limit = 10, minImportance = 0, type, tags, useVectorSearch = true } = options;
        let results = [];
        if (useVectorSearch) {
            // Use vector similarity search
            const queryVector = await this.embeddingService.generateEmbedding(query);
            results = await this.vectorStore.searchSimilar(query, limit);
        }
        else {
            // Use text search
            const stmt = this.db.prepare(`
        SELECT * FROM memories 
        WHERE content LIKE ? 
        AND importance >= ?
        ${type ? 'AND json_extract(metadata, "$.type") = ?' : ''}
        ${tags?.length ? 'AND json_extract(metadata, "$.tags") LIKE ?' : ''}
        ORDER BY importance DESC, created_at DESC
        LIMIT ?
      `);
            const rows = stmt.all(`%${query}%`, minImportance, ...(type ? [type] : []), ...(tags?.length ? [`%${tags.join('%')}%`] : []), limit);
            results = await Promise.all(rows.map(row => this.processMemoryRow(row)));
        }
        this.emit('searched', results);
        return results;
    }
    async processMemoryRow(row) {
        let content = row.content;
        if (row.compressed) {
            content = (await unzipAsync(Buffer.from(content, 'base64'))).toString();
        }
        return {
            id: row.id,
            content,
            metadata: JSON.parse(row.metadata),
            vector: row.embedding ? Array.from(new Float64Array(row.embedding)) : undefined,
            importance: row.importance,
            expiresAt: row.expires_at || undefined
        };
    }
    async getRecent(limit = 10) {
        if (!this.isInitialized || !this.db) {
            throw new Error('Memory service not initialized');
        }
        const stmt = this.db.prepare(`
      SELECT * FROM memories 
      WHERE expires_at IS NULL OR expires_at > ?
      ORDER BY created_at DESC 
      LIMIT ?
    `);
        const rows = stmt.all(Date.now(), limit);
        const results = await Promise.all(rows.map(row => this.processMemoryRow(row)));
        this.emit('recent', results);
        return results;
    }
    async delete(id) {
        if (!this.isInitialized || !this.db) {
            throw new Error('Memory service not initialized');
        }
        const stmt = this.db.prepare('DELETE FROM memories WHERE id = ?');
        stmt.run(id);
        this.cache.delete(id);
        this.emit('deleted', id);
    }
    async clear() {
        if (!this.isInitialized || !this.db) {
            throw new Error('Memory service not initialized');
        }
        this.db.exec('DELETE FROM memories');
        this.cache.clear();
        this.emit('cleared');
    }
    async export(path) {
        if (!this.isInitialized || !this.db) {
            throw new Error('Memory service not initialized');
        }
        if (!path || typeof path !== 'string') {
            throw new Error('Export path must be a valid string');
        }
        const memories = await this.getRecent(Number.MAX_SAFE_INTEGER);
        await fs.writeJson(path, memories, { spaces: 2 });
    }
    async import(path) {
        if (!this.isInitialized || !this.db) {
            throw new Error('Memory service not initialized');
        }
        if (!path || typeof path !== 'string') {
            throw new Error('Import path must be a valid string');
        }
        const memories = await fs.readJson(path);
        for (const memory of memories) {
            await this.store(memory);
        }
    }
    async getStats() {
        if (!this.isInitialized || !this.db) {
            throw new Error('Memory service not initialized');
        }
        const stats = this.db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN expires_at IS NULL OR expires_at > ? THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN expires_at <= ? THEN 1 ELSE 0 END) as expired,
        AVG(importance) as averageImportance
      FROM memories
    `).get(Date.now(), Date.now());
        return {
            ...stats,
            cacheSize: this.cache.size
        };
    }
}
exports.MemoryService = MemoryService;
//# sourceMappingURL=MemoryService.js.map