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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageStore = void 0;
const electron_1 = require("electron");
const path = __importStar(require("path"));
const fs = __importStar(require("fs-extra"));
const crypto = __importStar(require("crypto"));
class MessageStore {
    constructor() {
        // Initialize with dummy values that will be replaced in initialize()
        this.db = {};
        this.encryptionKey = Buffer.alloc(0);
    }
    async initialize() {
        const dbPath = path.join(electron_1.app.getPath('userData'), 'messages.db');
        this.db = new (require('better-sqlite3'))(dbPath);
        // Create tables with encryption
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        title TEXT,
        created_at INTEGER,
        updated_at INTEGER,
        metadata TEXT
      );
      
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT,
        role TEXT,
        content_encrypted BLOB,
        timestamp INTEGER,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id)
      );
      
      CREATE INDEX IF NOT EXISTS idx_messages_conversation 
        ON messages(conversation_id, timestamp);
    `);
        // Generate or retrieve encryption key
        this.encryptionKey = await this.getOrCreateKey();
    }
    async getOrCreateKey() {
        const keyPath = path.join(electron_1.app.getPath('userData'), '.key');
        if (await fs.pathExists(keyPath)) {
            const encrypted = await fs.readFile(keyPath);
            return Buffer.from(electron_1.safeStorage.decryptString(encrypted), 'base64');
        }
        const key = crypto.randomBytes(32);
        const encrypted = electron_1.safeStorage.encryptString(key.toString('base64'));
        await fs.writeFile(keyPath, encrypted);
        return key;
    }
    generateId() {
        return `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
    }
    async createConversation(title, metadata) {
        const id = this.generateId();
        const now = Date.now();
        this.db.prepare(`
      INSERT INTO conversations (id, title, created_at, updated_at, metadata)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, title, now, now, metadata ? JSON.stringify(metadata) : null);
        return id;
    }
    async saveMessage(conversationId, message) {
        const encrypted = this.encrypt(message.content);
        this.db.prepare(`
      INSERT INTO messages (id, conversation_id, role, content_encrypted, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `).run(message.id, conversationId, message.role, encrypted, message.timestamp);
        // Update conversation timestamp
        this.db.prepare(`
      UPDATE conversations 
      SET updated_at = ? 
      WHERE id = ?
    `).run(message.timestamp, conversationId);
    }
    async getConversation(id) {
        const rows = this.db.prepare(`
      SELECT id, role, content_encrypted, timestamp
      FROM messages
      WHERE conversation_id = ?
      ORDER BY timestamp ASC
    `).all(id);
        return rows.map(row => ({
            id: row.id,
            role: row.role,
            content: this.decrypt(row.content_encrypted),
            timestamp: row.timestamp
        }));
    }
    async listConversations() {
        const rows = this.db.prepare(`
      SELECT id, title, created_at, updated_at, metadata
      FROM conversations
      ORDER BY updated_at DESC
    `).all();
        return rows.map(row => ({
            id: row.id,
            title: row.title,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            metadata: row.metadata ? JSON.parse(row.metadata) : undefined
        }));
    }
    async deleteConversation(id) {
        this.db.prepare('DELETE FROM messages WHERE conversation_id = ?').run(id);
        this.db.prepare('DELETE FROM conversations WHERE id = ?').run(id);
    }
    async updateConversationTitle(id, title) {
        this.db.prepare(`
      UPDATE conversations 
      SET title = ?, updated_at = ? 
      WHERE id = ?
    `).run(title, Date.now(), id);
    }
    encrypt(text) {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
        const encrypted = Buffer.concat([
            cipher.update(text, 'utf8'),
            cipher.final()
        ]);
        const authTag = cipher.getAuthTag();
        return Buffer.concat([iv, authTag, encrypted]);
    }
    decrypt(data) {
        const iv = data.slice(0, 16);
        const authTag = data.slice(16, 32);
        const encrypted = data.slice(32);
        const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
        decipher.setAuthTag(authTag);
        return decipher.update(encrypted) + decipher.final('utf8');
    }
}
exports.MessageStore = MessageStore;
//# sourceMappingURL=MessageStore.js.map