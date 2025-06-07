import Database from 'better-sqlite3';
import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs-extra';
import { EventEmitter } from 'events';
import { logger } from '../utils/logger';
import { z } from 'zod';
import { MigrationManager } from '../database/migrations';

// Database schemas
const MessageSchema = z.object({
  id: z.string(),
  content: z.string(),
  role: z.enum(['user', 'assistant', 'system']),
  timestamp: z.number(),
  status: z.enum(['sending', 'sent', 'error']),
  error: z.string().optional(),
  metadata: z.record(z.unknown()).optional()
});

const ConversationSchema = z.object({
  id: z.string(),
  title: z.string(),
  created_at: z.number(),
  updated_at: z.number(),
  metadata: z.record(z.unknown()).optional()
});

const MemorySchema = z.object({
  id: z.string(),
  content: z.string(),
  metadata: z.record(z.unknown()),
  embedding: z.instanceof(Buffer).optional(),
  created_at: z.number(),
  updated_at: z.number(),
  importance: z.number(),
  expires_at: z.number().nullable(),
  compressed: z.boolean()
});

export type Message = z.infer<typeof MessageSchema>;
export type Conversation = z.infer<typeof ConversationSchema>;
export type Memory = z.infer<typeof MemorySchema>;

export class DatabaseService extends EventEmitter {
  private static instance: DatabaseService;
  private chatDb: Database;
  private memoryDb: Database;
  private migrationManager: MigrationManager;
  private isInitialized = false;
  private readonly BACKUP_DIR = 'backups';
  private readonly MAX_BACKUPS = 5;

  private constructor() {
    super();
    const userDataPath = app.getPath('userData');
    const chatDbPath = path.join(userDataPath, 'chat.db');
    const memoryDbPath = path.join(userDataPath, 'memory.db');
    
    this.chatDb = new Database(chatDbPath);
    this.memoryDb = new Database(memoryDbPath);
    this.migrationManager = MigrationManager.getInstance();
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize migration manager first
      await this.migrationManager.initialize();

      // Enable foreign keys
      this.chatDb.pragma('foreign_keys = ON');
      this.memoryDb.pragma('foreign_keys = ON');

      // Create backup directory
      const backupPath = path.join(app.getPath('userData'), this.BACKUP_DIR);
      await fs.ensureDir(backupPath);

      this.isInitialized = true;
      this.emit('initialized');
      logger.info('Database service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize database service:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
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
  public async saveMessage(message: Message): Promise<void> {
    const validated = MessageSchema.parse(message);
    const stmt = this.chatDb.prepare(`
      INSERT OR REPLACE INTO messages (
        id, conversation_id, content, role, timestamp, status, error, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      validated.id,
      validated.metadata?.conversationId,
      validated.content,
      validated.role,
      validated.timestamp,
      validated.status,
      validated.error || null,
      validated.metadata ? JSON.stringify(validated.metadata) : null
    );
  }

  public async getMessages(conversationId: string): Promise<Message[]> {
    const stmt = this.chatDb.prepare(`
      SELECT * FROM messages 
      WHERE conversation_id = ? 
      ORDER BY timestamp ASC
    `);

    const rows = stmt.all(conversationId);
    return rows.map(row => ({
      ...row,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined
    }));
  }

  public async createConversation(conversation: Conversation): Promise<void> {
    const validated = ConversationSchema.parse(conversation);
    const stmt = this.chatDb.prepare(`
      INSERT INTO conversations (id, title, created_at, updated_at, metadata)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(
      validated.id,
      validated.title,
      validated.created_at,
      validated.updated_at,
      validated.metadata ? JSON.stringify(validated.metadata) : null
    );
  }

  public async getConversations(): Promise<Conversation[]> {
    const stmt = this.chatDb.prepare(`
      SELECT * FROM conversations 
      ORDER BY updated_at DESC
    `);

    const rows = stmt.all();
    return rows.map(row => ({
      ...row,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined
    }));
  }

  // Memory operations
  public async saveMemory(memory: Memory): Promise<void> {
    const validated = MemorySchema.parse(memory);
    const stmt = this.memoryDb.prepare(`
      INSERT OR REPLACE INTO memories (
        id, content, metadata, embedding, created_at, updated_at, 
        importance, expires_at, compressed
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      validated.id,
      validated.content,
      JSON.stringify(validated.metadata),
      validated.embedding || null,
      validated.created_at,
      validated.updated_at,
      validated.importance,
      validated.expires_at,
      validated.compressed
    );
  }

  public async getMemories(limit: number = 100): Promise<Memory[]> {
    const stmt = this.memoryDb.prepare(`
      SELECT * FROM memories 
      WHERE expires_at IS NULL OR expires_at > ? 
      ORDER BY importance DESC, created_at DESC 
      LIMIT ?
    `);

    const rows = stmt.all(Date.now(), limit);
    return rows.map(row => ({
      ...row,
      metadata: JSON.parse(row.metadata),
      embedding: row.embedding ? Buffer.from(row.embedding) : undefined
    }));
  }

  // Backup and restore
  public async createBackup(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(
      app.getPath('userData'),
      this.BACKUP_DIR,
      `backup-${timestamp}.db`
    );

    // Backup chat database
    await fs.copy(
      path.join(app.getPath('userData'), 'chat.db'),
      `${backupPath}.chat`
    );

    // Backup memory database
    await fs.copy(
      path.join(app.getPath('userData'), 'memory.db'),
      `${backupPath}.memory`
    );

    // Cleanup old backups
    await this.cleanupOldBackups();

    return backupPath;
  }

  public async restoreFromBackup(backupPath: string): Promise<void> {
    // Close current connections
    this.chatDb.close();
    this.memoryDb.close();

    // Restore chat database
    await fs.copy(
      `${backupPath}.chat`,
      path.join(app.getPath('userData'), 'chat.db')
    );

    // Restore memory database
    await fs.copy(
      `${backupPath}.memory`,
      path.join(app.getPath('userData'), 'memory.db')
    );

    // Reinitialize connections
    await this.initialize();
  }

  private async cleanupOldBackups(): Promise<void> {
    const backupPath = path.join(app.getPath('userData'), this.BACKUP_DIR);
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
  public async cleanup(): Promise<void> {
    await this.migrationManager.cleanup();
    this.chatDb.close();
    this.memoryDb.close();
    this.isInitialized = false;
  }
} 