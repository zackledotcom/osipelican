import { app } from 'electron';
import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as crypto from 'crypto';
import { EventEmitter } from 'events';
import { gzip, unzip } from 'zlib';
import { promisify } from 'util';
import { EmbeddingService } from './EmbeddingService';
import { VectorStoreService } from './VectorStoreService';
import { logger } from '../utils/logger';

const gzipAsync = promisify(gzip);
const unzipAsync = promisify(unzip);

interface DatabaseRow {
  id: string;
  content: string;
  metadata: string;
  embedding: Buffer;
  created_at: number;
  updated_at: number;
  importance: number;
  expires_at: number | null;
  compressed: boolean;
}

interface DatabaseResult {
  changes: number;
  lastInsertRowid: number;
}

export interface MemoryChunk {
  id: string;
  content: string;
  metadata: {
    timestamp: number;
    source?: string;
    type?: string;
    tags?: string[];
    importance?: number;
    context?: {
      conversationId?: string;
      messageId?: string;
      [key: string]: any;
    };
    embedding?: number[];
    [key: string]: any;
  };
  vector?: number[];
  similarity?: number;
  importance?: number;
  expiresAt?: number;
}

export class MemoryService extends EventEmitter {
  private static instance: MemoryService;
  private isInitialized: boolean = false;
  private db: Database | null = null;
  private embeddingService: EmbeddingService;
  private vectorStore: VectorStoreService;
  private cache: Map<string, MemoryChunk> = new Map();
  private readonly CACHE_SIZE = 1000;
  private readonly COMPRESSION_THRESHOLD = 1024; // 1KB
  private readonly DEFAULT_EXPIRY = 30 * 24 * 60 * 60 * 1000; // 30 days
  private readonly IMPORTANCE_DECAY = 0.95; // 5% decay per day

  private constructor() {
    super();
    this.embeddingService = EmbeddingService.getInstance();
    this.vectorStore = VectorStoreService.getInstance();
  }

  public static getInstance(): MemoryService {
    if (!MemoryService.instance) {
      MemoryService.instance = new MemoryService();
    }
    return MemoryService.instance;
  }

  public async initialize(): Promise<{ success: boolean; error?: string }> {
    try {
      if (this.isInitialized) {
        return { success: true };
      }

      const dbPath = path.join(app.getPath('userData'), 'memory.db');
      this.db = new Database(dbPath);

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
    } catch (error) {
      logger.error('Failed to initialize memory service:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to initialize memory service' 
      };
    }
  }

  private startMaintenanceTasks(): void {
    // Clean expired memories every hour
    setInterval(() => this.cleanExpiredMemories(), 60 * 60 * 1000);
    
    // Update importance scores daily
    setInterval(() => this.updateImportanceScores(), 24 * 60 * 60 * 1000);
    
    // Prune low-importance memories weekly
    setInterval(() => this.pruneLowImportanceMemories(), 7 * 24 * 60 * 60 * 1000);
  }

  private async cleanExpiredMemories(): Promise<void> {
    if (!this.db) return;

    const stmt = this.db.prepare(`
      DELETE FROM memories 
      WHERE expires_at IS NOT NULL AND expires_at < ?
    `);
    
    try {
      const result = stmt.run(Date.now()) as unknown as DatabaseResult;
      if (result.changes > 0) {
        this.emit('pruned', result.changes);
      }
    } catch (error) {
      logger.error('Error cleaning expired memories:', error);
    }
  }

  private async updateImportanceScores(): Promise<void> {
    if (!this.db) return;

    const stmt = this.db.prepare(`
      UPDATE memories 
      SET importance = importance * ?
      WHERE expires_at IS NULL OR expires_at > ?
    `);
    
    try {
      stmt.run(this.IMPORTANCE_DECAY, Date.now());
    } catch (error) {
      logger.error('Error updating importance scores:', error);
    }
  }

  private async pruneLowImportanceMemories(): Promise<void> {
    if (!this.db) return;

    const stmt = this.db.prepare(`
      DELETE FROM memories 
      WHERE importance < 0.1 
      AND (expires_at IS NULL OR expires_at > ?)
    `);
    
    try {
      const result = stmt.run(Date.now()) as unknown as DatabaseResult;
      if (result.changes > 0) {
        this.emit('pruned', result.changes);
      }
    } catch (error) {
      logger.error('Error pruning low importance memories:', error);
    }
  }

  public async store(chunk: MemoryChunk): Promise<void> {
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
      stmt.run(
        chunk.id,
        content,
        JSON.stringify(chunk.metadata),
        new Float64Array(chunk.vector).buffer,
        Date.now(),
        Date.now(),
        importance,
        chunk.expiresAt || null,
        shouldCompress
      );

      // Update cache
      this.updateCache(chunk);

      this.emit('stored', chunk);
    } catch (error) {
      logger.error('Error storing memory:', error);
      throw error;
    }
  }

  private calculateImportance(chunk: MemoryChunk): number {
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

  private updateCache(chunk: MemoryChunk): void {
    if (this.cache.size >= this.CACHE_SIZE) {
      // Remove least recently used item
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    this.cache.set(chunk.id, chunk);
  }

  public async search(query: string, options: {
    limit?: number;
    minImportance?: number;
    type?: string;
    tags?: string[];
    useVectorSearch?: boolean;
  } = {}): Promise<MemoryChunk[]> {
    if (!this.isInitialized || !this.db) {
      throw new Error('Memory service not initialized');
    }

    const {
      limit = 10,
      minImportance = 0,
      type,
      tags,
      useVectorSearch = true
    } = options;

    let results: MemoryChunk[] = [];

    if (useVectorSearch) {
      // Use vector similarity search
      const queryVector = await this.embeddingService.generateEmbedding(query);
      results = await this.vectorStore.searchSimilar(query, limit);
    } else {
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

      const rows = stmt.all(
        `%${query}%`,
        minImportance,
        ...(type ? [type] : []),
        ...(tags?.length ? [`%${tags.join('%')}%`] : []),
        limit
      );

      results = await Promise.all(rows.map(row => this.processMemoryRow(row)));
    }

    this.emit('searched', results);
    return results;
  }

  private async processMemoryRow(row: DatabaseRow): Promise<MemoryChunk> {
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

  public async getRecent(limit: number = 10): Promise<MemoryChunk[]> {
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

  public async delete(id: string): Promise<void> {
    if (!this.isInitialized || !this.db) {
      throw new Error('Memory service not initialized');
    }

    const stmt = this.db.prepare('DELETE FROM memories WHERE id = ?');
    stmt.run(id);
    this.cache.delete(id);
    this.emit('deleted', id);
  }

  public async clear(): Promise<void> {
    if (!this.isInitialized || !this.db) {
      throw new Error('Memory service not initialized');
    }

    this.db.exec('DELETE FROM memories');
    this.cache.clear();
    this.emit('cleared');
  }

  public async export(path: string): Promise<void> {
    if (!this.isInitialized || !this.db) {
      throw new Error('Memory service not initialized');
    }
    if (!path || typeof path !== 'string') {
      throw new Error('Export path must be a valid string');
    }
    const memories = await this.getRecent(Number.MAX_SAFE_INTEGER);
    await fs.writeJson(path, memories, { spaces: 2 });
  }

  public async import(path: string): Promise<void> {
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

  public async getStats(): Promise<{
    total: number;
    active: number;
    expired: number;
    averageImportance: number;
    cacheSize: number;
  }> {
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