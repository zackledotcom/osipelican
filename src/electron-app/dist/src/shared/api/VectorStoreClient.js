"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VectorStoreClient = void 0;
const events_1 = require("events");
const logger_1 = require("../../utils/logger");
const node_fetch_1 = __importDefault(require("node-fetch"));
class VectorStoreClient extends events_1.EventEmitter {
    constructor() {
        super();
        this.baseUrl = 'http://localhost:11434/api/vector';
        this.isInitialized = false;
    }
    static getInstance() {
        if (!VectorStoreClient.instance) {
            VectorStoreClient.instance = new VectorStoreClient();
        }
        return VectorStoreClient.instance;
    }
    async initialize() {
        if (this.isInitialized) {
            logger_1.logger.info('VectorStoreClient already initialized');
            return;
        }
        try {
            logger_1.logger.info('Initializing VectorStoreClient...');
            // Check if vector store is available
            const response = await (0, node_fetch_1.default)(`${this.baseUrl}/status`);
            if (!response.ok) {
                throw new Error(`Vector store not available: ${response.statusText}`);
            }
            this.isInitialized = true;
            logger_1.logger.info('VectorStoreClient initialized successfully');
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize VectorStoreClient:', error);
            throw error;
        }
    }
    async addDocument(document) {
        try {
            const response = await (0, node_fetch_1.default)(`${this.baseUrl}/documents`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(document)
            });
            if (!response.ok) {
                throw new Error(`Failed to add document: ${response.statusText}`);
            }
            return response.json();
        }
        catch (error) {
            logger_1.logger.error('Error adding document:', error);
            throw error;
        }
    }
    async updateDocument(id, document) {
        try {
            const response = await (0, node_fetch_1.default)(`${this.baseUrl}/documents/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(document)
            });
            if (!response.ok) {
                throw new Error(`Failed to update document: ${response.statusText}`);
            }
            return response.json();
        }
        catch (error) {
            logger_1.logger.error('Error updating document:', error);
            throw error;
        }
    }
    async deleteDocument(id) {
        try {
            const response = await (0, node_fetch_1.default)(`${this.baseUrl}/documents/${id}`, {
                method: 'DELETE'
            });
            if (!response.ok) {
                throw new Error(`Failed to delete document: ${response.statusText}`);
            }
        }
        catch (error) {
            logger_1.logger.error('Error deleting document:', error);
            throw error;
        }
    }
    async search(query, options = {}) {
        try {
            const response = await (0, node_fetch_1.default)(`${this.baseUrl}/search`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query, ...options })
            });
            if (!response.ok) {
                throw new Error(`Search failed: ${response.statusText}`);
            }
            return response.json();
        }
        catch (error) {
            logger_1.logger.error('Error searching documents:', error);
            throw error;
        }
    }
    async getStats() {
        try {
            const response = await (0, node_fetch_1.default)(`${this.baseUrl}/stats`);
            if (!response.ok) {
                throw new Error(`Failed to get stats: ${response.statusText}`);
            }
            return response.json();
        }
        catch (error) {
            logger_1.logger.error('Error getting vector store stats:', error);
            throw error;
        }
    }
    async getDocument(id) {
        try {
            const response = await (0, node_fetch_1.default)(`${this.baseUrl}/documents/${id}`);
            if (!response.ok) {
                throw new Error(`Failed to get document: ${response.statusText}`);
            }
            return response.json();
        }
        catch (error) {
            logger_1.logger.error('Error getting document:', error);
            throw error;
        }
    }
    async listDocuments(options = {}) {
        try {
            const queryParams = new URLSearchParams();
            if (options.limit)
                queryParams.append('limit', options.limit.toString());
            if (options.offset)
                queryParams.append('offset', options.offset.toString());
            const response = await (0, node_fetch_1.default)(`${this.baseUrl}/documents?${queryParams}`);
            if (!response.ok) {
                throw new Error(`Failed to list documents: ${response.statusText}`);
            }
            return response.json();
        }
        catch (error) {
            logger_1.logger.error('Error listing documents:', error);
            throw error;
        }
    }
}
exports.VectorStoreClient = VectorStoreClient;
//# sourceMappingURL=VectorStoreClient.js.map