import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs-extra';
import { logger } from '../utils/logger';
import Database from 'better-sqlite3';

interface Migration {
  version: number;
  name: string;
  up: (db: Database) => void;
  down: (db: Database) => void;
}

// Migration definitions
const migrations: Migration[] = [
  {
    version: 1,
    name: 'Initial schema',
    up: (db: Database) => {
      // Chat tables
      db.exec(`
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
      db.exec(`
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
    },
    down: (db: Database) => {
      db.exec(`
        DROP TABLE IF EXISTS messages;
        DROP TABLE IF EXISTS conversations;
        DROP TABLE IF EXISTS memories;
      `);
    }
  },
  {
    version: 2,
    name: 'Add message tags',
    up: (db: Database) => {
      db.exec(`
        ALTER TABLE messages ADD COLUMN tags TEXT;
        CREATE INDEX IF NOT EXISTS idx_messages_tags ON messages(tags);
      `);
    },
    down: (db: Database) => {
      // SQLite doesn't support dropping columns, so we need to recreate the table
      db.exec(`
        CREATE TABLE messages_new (
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
        
        INSERT INTO messages_new 
        SELECT id, conversation_id, content, role, timestamp, status, error, metadata 
        FROM messages;
        
        DROP TABLE messages;
        ALTER TABLE messages_new RENAME TO messages;
        
        CREATE INDEX IF NOT EXISTS idx_messages_conversation 
          ON messages(conversation_id, timestamp);
      `);
    }
  }
];

export class MigrationManager {
  private static instance: MigrationManager;
  private chatDb: Database;
  private memoryDb: Database;
  private isInitialized = false;

  private constructor() {
    const userDataPath = app.getPath('userData');
    const chatDbPath = path.join(userDataPath, 'chat.db');
    const memoryDbPath = path.join(userDataPath, 'memory.db');
    
    this.chatDb = new Database(chatDbPath);
    this.memoryDb = new Database(memoryDbPath);
  }

  public static getInstance(): MigrationManager {
    if (!MigrationManager.instance) {
      MigrationManager.instance = new MigrationManager();
    }
    return MigrationManager.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Enable foreign keys
      this.chatDb.pragma('foreign_keys = ON');
      this.memoryDb.pragma('foreign_keys = ON');

      // Create migrations table if it doesn't exist
      this.chatDb.exec(`
        CREATE TABLE IF NOT EXISTS migrations (
          version INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          applied_at INTEGER NOT NULL
        );
      `);

      // Run migrations
      await this.runMigrations();

      this.isInitialized = true;
      logger.info('Migration manager initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize migration manager:', error);
      throw error;
    }
  }

  private async runMigrations(): Promise<void> {
    const appliedMigrations = this.getAppliedMigrations();
    const pendingMigrations = migrations.filter(
      m => !appliedMigrations.includes(m.version)
    );

    if (pendingMigrations.length === 0) {
      logger.info('No pending migrations');
      return;
    }

    logger.info(`Running ${pendingMigrations.length} pending migrations`);

    for (const migration of pendingMigrations) {
      try {
        // Start transaction
        this.chatDb.exec('BEGIN TRANSACTION');
        this.memoryDb.exec('BEGIN TRANSACTION');

        // Run migration
        migration.up(this.chatDb);
        migration.up(this.memoryDb);

        // Record migration
        this.chatDb.prepare(`
          INSERT INTO migrations (version, name, applied_at)
          VALUES (?, ?, ?)
        `).run(migration.version, migration.name, Date.now());

        // Commit transaction
        this.chatDb.exec('COMMIT');
        this.memoryDb.exec('COMMIT');

        logger.info(`Applied migration ${migration.version}: ${migration.name}`);
      } catch (error) {
        // Rollback transaction
        this.chatDb.exec('ROLLBACK');
        this.memoryDb.exec('ROLLBACK');

        logger.error(`Failed to apply migration ${migration.version}:`, error);
        throw error;
      }
    }
  }

  private getAppliedMigrations(): number[] {
    const stmt = this.chatDb.prepare('SELECT version FROM migrations ORDER BY version');
    return stmt.all().map(row => row.version);
  }

  public async rollback(version: number): Promise<void> {
    const appliedMigrations = this.getAppliedMigrations();
    const migrationsToRollback = migrations
      .filter(m => m.version <= version && appliedMigrations.includes(m.version))
      .sort((a, b) => b.version - a.version);

    if (migrationsToRollback.length === 0) {
      logger.info('No migrations to rollback');
      return;
    }

    logger.info(`Rolling back ${migrationsToRollback.length} migrations`);

    for (const migration of migrationsToRollback) {
      try {
        // Start transaction
        this.chatDb.exec('BEGIN TRANSACTION');
        this.memoryDb.exec('BEGIN TRANSACTION');

        // Run rollback
        migration.down(this.chatDb);
        migration.down(this.memoryDb);

        // Remove migration record
        this.chatDb.prepare('DELETE FROM migrations WHERE version = ?')
          .run(migration.version);

        // Commit transaction
        this.chatDb.exec('COMMIT');
        this.memoryDb.exec('COMMIT');

        logger.info(`Rolled back migration ${migration.version}: ${migration.name}`);
      } catch (error) {
        // Rollback transaction
        this.chatDb.exec('ROLLBACK');
        this.memoryDb.exec('ROLLBACK');

        logger.error(`Failed to rollback migration ${migration.version}:`, error);
        throw error;
      }
    }
  }

  public async cleanup(): Promise<void> {
    this.chatDb.close();
    this.memoryDb.close();
    this.isInitialized = false;
  }
} 