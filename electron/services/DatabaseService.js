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
exports.DatabaseService = void 0;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const electron_1 = require("electron");
const path = __importStar(require("path"));
const fs = __importStar(require("fs-extra"));
const events_1 = require("events");
const logger_1 = require("./utils/logger");
const zod_1 = require("zod");
const migrations_1 = require("./database/migrations");
// Database schemas
const MessageSchema = zod_1.z.object({
    id: zod_1.z.string(),
    content: zod_1.z.string(),
    role: zod_1.z.enum(['user', 'assistant', 'system']),
    timestamp: zod_1.z.number(),
    status: zod_1.z.enum(['sending', 'sent', 'error']),
    error: zod_1.z.string().optional(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional()
});
const ConversationSchema = zod_1.z.object({
    id: zod_1.z.string(),
    title: zod_1.z.string(),
    created_at: zod_1.z.number(),
    updated_at: zod_1.z.number(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional()
});
const MemorySchema = zod_1.z.object({
    id: zod_1.z.string(),
    content: zod_1.z.string(),
    metadata: zod_1.z.record(zod_1.z.unknown()),
    embedding: zod_1.z.instanceof(Buffer).optional(),
    created_at: zod_1.z.number(),
    updated_at: zod_1.z.number(),
    importance: zod_1.z.number(),
    expires_at: zod_1.z.number().nullable(),
    compressed: zod_1.z.boolean()
});
class DatabaseService extends events_1.EventEmitter {
    constructor() {
        super();
        this.isInitialized = false;
        this.BACKUP_DIR = 'backups';
        this.MAX_BACKUPS = 5;
        const userDataPath = electron_1.app.getPath('userData');
        const chatDbPath = path.join(userDataPath, 'chat.db');
        const memoryDbPath = path.join(userDataPath, 'memory.db');
        this.chatDb = new better_sqlite3_1.default(chatDbPath);
        this.memoryDb = new better_sqlite3_1.default(memoryDbPath);
        this.migrationManager = migrations_1.MigrationManager.getInstance();
    }
    static getInstance() {
        if (!DatabaseService.instance) {
            DatabaseService.instance = new DatabaseService();
        }
        return DatabaseService.instance;
    }
    async initialize() {
        if (this.isInitialized)
            return;
        try {
            // Initialize migration manager first
            await this.migrationManager.initialize();
            // Enable foreign keys
            this.chatDb.pragma('foreign_keys = ON');
            this.memoryDb.pragma('foreign_keys = ON');
            // Create backup directory
            const backupPath = path.join(electron_1.app.getPath('userData'), this.BACKUP_DIR);
            await fs.ensureDir(backupPath);
            this.isInitialized = true;
            this.emit('initialized');
            logger_1.logger.info('Database service initialized successfully');
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize database service:', error);
            throw error;
        }
    }
    async createTables() {
        // Chat tables
        this.chatDb.exec(`
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        metadata TEXT
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        content TEXT NOT NULL,
        role TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        status TEXT NOT NULL,
        error TEXT,
        metadata TEXT,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_messages_conversation 
        ON messages(conversation_id, timestamp);
    `);
        // Memory tables
        this.memoryDb.exec(`
      CREATE TABLE IF NOT EXISTS memories (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        metadata TEXT NOT NULL,
        embedding BLOB,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
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
    }
    // Chat operations
    async saveMessage(message) {
        const validated = MessageSchema.parse(message);
        const stmt = this.chatDb.prepare(`
      INSERT OR REPLACE INTO messages (
        id, conversation_id, content, role, timestamp, status, error, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
        stmt.run(validated.id, validated.metadata?.conversationId, validated.content, validated.role, validated.timestamp, validated.status, validated.error || null, validated.metadata ? JSON.stringify(validated.metadata) : null);
    }
    async getMessages(conversationId) {
        const stmt = this.chatDb.prepare(`
      SELECT * FROM messages 
      WHERE conversation_id = ? 
      ORDER BY timestamp ASC
    `);
        const rows = stmt.all(conversationId);
        return rows.map((row) => ({
            ...row,
            metadata: row.metadata ? JSON.parse(row.metadata) : undefined
        }));
    }
    async createConversation(conversation) {
        const validated = ConversationSchema.parse(conversation);
        const stmt = this.chatDb.prepare(`
      INSERT INTO conversations (id, title, created_at, updated_at, metadata)
      VALUES (?, ?, ?, ?, ?)
    `);
        stmt.run(validated.id, validated.title, validated.created_at, validated.updated_at, validated.metadata ? JSON.stringify(validated.metadata) : null);
    }
    async getConversations() {
        const stmt = this.chatDb.prepare(`
      SELECT * FROM conversations 
      ORDER BY updated_at DESC
    `);
        const rows = stmt.all();
        return rows.map((row) => ({
            ...row,
            metadata: row.metadata ? JSON.parse(row.metadata) : undefined
        }));
    }
    // Memory operations
    async saveMemory(memory) {
        const validated = MemorySchema.parse(memory);
        const stmt = this.memoryDb.prepare(`
      INSERT OR REPLACE INTO memories (
        id, content, metadata, embedding, created_at, updated_at, 
        importance, expires_at, compressed
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        stmt.run(validated.id, validated.content, JSON.stringify(validated.metadata), validated.embedding || null, validated.created_at, validated.updated_at, validated.importance, validated.expires_at, validated.compressed);
    }
    async getMemories(limit = 100) {
        const stmt = this.memoryDb.prepare(`
      SELECT * FROM memories 
      WHERE expires_at IS NULL OR expires_at > ? 
      ORDER BY importance DESC, created_at DESC 
      LIMIT ?
    `);
        const rows = stmt.all(Date.now(), limit);
        return rows.map((row) => ({
            ...row,
            metadata: JSON.parse(row.metadata),
            embedding: row.embedding ? Buffer.from(row.embedding) : undefined
        }));
    }
    // Backup and restore
    async createBackup() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path.join(electron_1.app.getPath('userData'), this.BACKUP_DIR, `backup-${timestamp}.db`);
        // Backup chat database
        await fs.copy(path.join(electron_1.app.getPath('userData'), 'chat.db'), `${backupPath}.chat`);
        // Backup memory database
        await fs.copy(path.join(electron_1.app.getPath('userData'), 'memory.db'), `${backupPath}.memory`);
        // Cleanup old backups
        await this.cleanupOldBackups();
        return backupPath;
    }
    async restoreFromBackup(backupPath) {
        // Close current connections
        this.chatDb.close();
        this.memoryDb.close();
        // Restore chat database
        await fs.copy(`${backupPath}.chat`, path.join(electron_1.app.getPath('userData'), 'chat.db'));
        // Restore memory database
        await fs.copy(`${backupPath}.memory`, path.join(electron_1.app.getPath('userData'), 'memory.db'));
        // Reinitialize connections
        await this.initialize();
    }
    async cleanupOldBackups() {
        const backupPath = path.join(electron_1.app.getPath('userData'), this.BACKUP_DIR);
        const backups = await fs.readdir(backupPath);
        if (backups.length > this.MAX_BACKUPS) {
            const sortedBackups = backups
                .filter(b => b.startsWith('backup-'))
                .sort()
                .reverse();
            for (const backup of sortedBackups.slice(this.MAX_BACKUPS)) {
                await fs.remove(path.join(backupPath, backup));
            }
        }
    }
    // Cleanup
    async cleanup() {
        await this.migrationManager.cleanup();
        this.chatDb.close();
        this.memoryDb.close();
        this.isInitialized = false;
    }
}
exports.DatabaseService = DatabaseService;
