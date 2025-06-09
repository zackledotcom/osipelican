"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VectorStoreService = void 0;
const logger_1 = require("../utils/logger");
const uuid_1 = require("uuid");
const hnswlib_node_1 = __importDefault(require("hnswlib-node"));
const path_1 = __importDefault(require("path"));
const electron_1 = require("electron");
const EmbeddingService_1 = require("./EmbeddingService");
const events_1 = require("events");
class VectorStoreService extends events_1.EventEmitter {
    constructor(embeddingService) {
        super();
        this.CHUNK_SIZE = 1000;
        this.CHUNK_OVERLAP = 200;
        this.VECTOR_SIZE = 1536; // OpenAI embedding dimension
        this.MAX_ELEMENTS = 100000; // Maximum number of vectors to store
        this.INDEX_PATH = 'vector-store';
        this.SIMILARITY_THRESHOLD = 0.7;
        this.documents = new Map();
        this.vectorMap = new Map(); // Maps vector IDs to document IDs
        this.nextId = 0;
        this.isInitialized = false;
        this.embeddingService = embeddingService;
    }
    static getInstance() {
        if (!VectorStoreService.instance) {
            const embeddingService = EmbeddingService_1.EmbeddingService.getInstance();
            VectorStoreService.instance = new VectorStoreService(embeddingService);
        }
        return VectorStoreService.instance;
    }
    async initialize() {
        if (this.isInitialized)
            return;
        try {
            logger_1.logger.info('Initializing VectorStoreService');
            // Initialize HNSW index
            this.index = new hnswlib_node_1.default.HierarchicalNSW('cosine', this.VECTOR_SIZE);
            await this.index.initIndex(this.MAX_ELEMENTS);
            // Load existing index if available
            const indexPath = path_1.default.join(electron_1.app.getPath('userData'), this.INDEX_PATH);
            try {
                await this.index.readIndex(indexPath);
                await this.loadDocuments();
                logger_1.logger.info('Loaded existing vector store index');
            }
            catch (e) {
                logger_1.logger.info('No existing index found, creating new one');
            }
            this.isInitialized = true;
            this.emit('initialized');
        }
        catch (error) {
            logger_1.logger.error('Error initializing vector store:', error);
            throw error;
        }
    }
    async loadDocuments() {
        try {
            // TODO: Implement document loading from disk
            logger_1.logger.info('Loading documents from disk');
        }
        catch (error) {
            logger_1.logger.error('Error loading documents:', error);
            throw error;
        }
    }
    async saveIndex() {
        try {
            const indexPath = path_1.default.join(electron_1.app.getPath('userData'), this.INDEX_PATH);
            await this.index.writeIndex(indexPath);
            logger_1.logger.info('Saved vector store index');
        }
        catch (error) {
            logger_1.logger.error('Error saving vector store index:', error);
            throw error;
        }
    }
    chunkText(text) {
        const chunks = [];
        let start = 0;
        while (start < text.length) {
            const end = Math.min(start + this.CHUNK_SIZE, text.length);
            let chunk = text.slice(start, end);
            // If we're not at the end, try to find a good break point
            if (end < text.length) {
                const lastPeriod = chunk.lastIndexOf('.');
                const lastSpace = chunk.lastIndexOf(' ');
                if (lastPeriod > this.CHUNK_SIZE - this.CHUNK_OVERLAP) {
                    chunk = chunk.slice(0, lastPeriod + 1);
                    start = start + lastPeriod + 1;
                }
                else if (lastSpace > this.CHUNK_SIZE - this.CHUNK_OVERLAP) {
                    chunk = chunk.slice(0, lastSpace + 1);
                    start = start + lastSpace + 1;
                }
                else {
                    start = end;
                }
            }
            else {
                start = end;
            }
            chunks.push(chunk);
        }
        return chunks;
    }
    async addDocument(document) {
        if (!this.isInitialized) {
            throw new Error('Vector store not initialized');
        }
        try {
            const id = (0, uuid_1.v4)();
            const chunks = this.chunkText(document.content);
            for (const chunk of chunks) {
                const chunkId = (0, uuid_1.v4)();
                const chunkDoc = {
                    id: chunkId,
                    content: chunk,
                    metadata: {
                        ...document.metadata,
                        originalId: id,
                        chunkIndex: chunks.indexOf(chunk),
                        totalChunks: chunks.length,
                    },
                };
                // Generate embedding
                const embedding = await this.embeddingService.generateEmbedding(chunk);
                // Add to vector store
                await this.index.addPoint(embedding, this.nextId);
                this.vectorMap.set(this.nextId, chunkId);
                this.documents.set(chunkId, chunkDoc);
                this.nextId++;
                // Check if we need to resize the index
                if (this.nextId >= this.index.getMaxElements()) {
                    const newSize = Math.min(this.index.getMaxElements() * 2, this.MAX_ELEMENTS);
                    await this.index.resizeIndex(newSize);
                    logger_1.logger.info(`Resized vector store index to ${newSize} elements`);
                }
            }
            // Save index periodically
            if (this.nextId % 100 === 0) {
                await this.saveIndex();
            }
            this.emit('documentAdded', id);
        }
        catch (error) {
            logger_1.logger.error('Error adding document:', error);
            throw error;
        }
    }
    async searchSimilar(query, k = 5) {
        if (!this.isInitialized) {
            throw new Error('Vector store not initialized');
        }
        try {
            // Generate query embedding
            const queryEmbedding = await this.embeddingService.generateEmbedding(query);
            // Search for similar vectors
            const { neighbors } = await this.index.searchKnn(queryEmbedding, k);
            // Map vector IDs back to documents
            const results = [];
            for (const neighborId of neighbors) {
                const docId = this.vectorMap.get(neighborId);
                if (docId) {
                    const doc = this.documents.get(docId);
                    if (doc) {
                        results.push(doc);
                    }
                }
            }
            return results;
        }
        catch (error) {
            logger_1.logger.error('Error searching documents:', error);
            throw error;
        }
    }
    async deleteDocument(id) {
        if (!this.isInitialized) {
            throw new Error('Vector store not initialized');
        }
        try {
            // Delete all chunks associated with the document
            for (const [chunkId, doc] of this.documents.entries()) {
                if (doc.metadata.originalId === id) {
                    this.documents.delete(chunkId);
                    // Note: We can't remove from HNSW index, but we can mark as deleted
                    // in the vectorMap by setting to null
                    for (const [vectorId, docId] of this.vectorMap.entries()) {
                        if (docId === chunkId) {
                            this.vectorMap.set(vectorId, '');
                        }
                    }
                }
            }
            this.emit('documentDeleted', id);
        }
        catch (error) {
            logger_1.logger.error('Error deleting document:', error);
            throw error;
        }
    }
    async clear() {
        if (!this.isInitialized) {
            throw new Error('Vector store not initialized');
        }
        try {
            this.documents.clear();
            this.vectorMap.clear();
            await this.index.clearIndex();
            this.nextId = 0;
            this.emit('cleared');
        }
        catch (error) {
            logger_1.logger.error('Error clearing vector store:', error);
            throw error;
        }
    }
    async getStats() {
        if (!this.isInitialized) {
            throw new Error('Vector store not initialized');
        }
        return {
            totalDocuments: this.documents.size,
            totalVectors: this.nextId,
            indexSize: this.index.getCurrentCount(),
            maxElements: this.index.getMaxElements(),
        };
    }
    async cleanup() {
        if (!this.isInitialized)
            return;
        try {
            await this.saveIndex();
            this.isInitialized = false;
        }
        catch (error) {
            logger_1.logger.error('Error cleaning up vector store:', error);
            throw error;
        }
    }
}
exports.VectorStoreService = VectorStoreService;
//# sourceMappingURL=VectorStoreService.js.map