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
exports.MigrationManager = void 0;
const electron_1 = require("electron");
const path = __importStar(require("path"));
const logger_1 = require("../utils/logger");
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
// Migration definitions
const migrations = [
    {
        version: 1,
        name: 'Initial schema',
        up: (db) => {
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
        down: (db) => {
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
        up: (db) => {
            db.exec(`
        ALTER TABLE messages ADD COLUMN tags TEXT;
        CREATE INDEX IF NOT EXISTS idx_messages_tags ON messages(tags);
      `);
        },
        down: (db) => {
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
class MigrationManager {
    constructor() {
        this.isInitialized = false;
        const userDataPath = electron_1.app.getPath('userData');
        const chatDbPath = path.join(userDataPath, 'chat.db');
        const memoryDbPath = path.join(userDataPath, 'memory.db');
        this.chatDb = new better_sqlite3_1.default(chatDbPath);
        this.memoryDb = new better_sqlite3_1.default(memoryDbPath);
    }
    static getInstance() {
        if (!MigrationManager.instance) {
            MigrationManager.instance = new MigrationManager();
        }
        return MigrationManager.instance;
    }
    async initialize() {
        if (this.isInitialized)
            return;
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
            logger_1.logger.info('Migration manager initialized successfully');
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize migration manager:', error);
            throw error;
        }
    }
    async runMigrations() {
        const appliedMigrations = this.getAppliedMigrations();
        const pendingMigrations = migrations.filter(m => !appliedMigrations.includes(m.version));
        if (pendingMigrations.length === 0) {
            logger_1.logger.info('No pending migrations');
            return;
        }
        logger_1.logger.info(`Running ${pendingMigrations.length} pending migrations`);
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
                logger_1.logger.info(`Applied migration ${migration.version}: ${migration.name}`);
            }
            catch (error) {
                // Rollback transaction
                this.chatDb.exec('ROLLBACK');
                this.memoryDb.exec('ROLLBACK');
                logger_1.logger.error(`Failed to apply migration ${migration.version}:`, error);
                throw error;
            }
        }
    }
    getAppliedMigrations() {
        const stmt = this.chatDb.prepare('SELECT version FROM migrations ORDER BY version');
        return stmt.all().map(row => row.version);
    }
    async rollback(version) {
        const appliedMigrations = this.getAppliedMigrations();
        const migrationsToRollback = migrations
            .filter(m => m.version <= version && appliedMigrations.includes(m.version))
            .sort((a, b) => b.version - a.version);
        if (migrationsToRollback.length === 0) {
            logger_1.logger.info('No migrations to rollback');
            return;
        }
        logger_1.logger.info(`Rolling back ${migrationsToRollback.length} migrations`);
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
                logger_1.logger.info(`Rolled back migration ${migration.version}: ${migration.name}`);
            }
            catch (error) {
                // Rollback transaction
                this.chatDb.exec('ROLLBACK');
                this.memoryDb.exec('ROLLBACK');
                logger_1.logger.error(`Failed to rollback migration ${migration.version}:`, error);
                throw error;
            }
        }
    }
    async cleanup() {
        this.chatDb.close();
        this.memoryDb.close();
        this.isInitialized = false;
    }
}
exports.MigrationManager = MigrationManager;
//# sourceMappingURL=migrations.js.map