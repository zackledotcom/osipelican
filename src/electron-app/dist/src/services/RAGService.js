"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RAGService = void 0;
const Service_1 = require("./Service");
const logger_1 = require("../utils/logger");
const EmbeddingService_1 = require("./EmbeddingService");
const VectorStoreService_1 = require("./VectorStoreService");
class RAGService extends Service_1.BaseService {
    constructor(config) {
        super(config);
        this.chunkConfig = config.chunkConfig;
        this.embeddingModel = config.embeddingModel;
        this.embeddingService = EmbeddingService_1.EmbeddingService.getInstance();
        this.vectorStore = VectorStoreService_1.VectorStoreService.getInstance();
    }
    static getInstance() {
        if (!RAGService.instance) {
            RAGService.instance = new RAGService({
                name: 'rag',
                autoStart: true,
                restartOnCrash: true,
                maxRestarts: 3,
                restartDelay: 1000,
                chunkConfig: {
                    chunkSize: 1000,
                    chunkOverlap: 200,
                },
                embeddingModel: 'nomic-embed-text',
            });
        }
        return RAGService.instance;
    }
    async initialize() {
        try {
            logger_1.logger.info('Initializing RAGService');
            await this.embeddingService.initialize();
            await this.vectorStore.initialize();
            logger_1.logger.info('RAGService initialized successfully');
        }
        catch (error) {
            logger_1.logger.error('Error initializing RAGService:', error);
            throw error;
        }
    }
    chunkText(text) {
        const chunks = [];
        let startIndex = 0;
        while (startIndex < text.length) {
            const endIndex = Math.min(startIndex + this.chunkConfig.chunkSize, text.length);
            chunks.push(text.slice(startIndex, endIndex));
            startIndex = endIndex - this.chunkConfig.chunkOverlap;
        }
        return chunks;
    }
    async addDocument(document) {
        try {
            logger_1.logger.info(`Adding document: ${document.id}`);
            const chunks = this.chunkText(document.content);
            for (const chunk of chunks) {
                const embedding = await this.embeddingService.generateEmbedding(chunk);
                await this.vectorStore.addDocument({
                    content: chunk,
                    metadata: {
                        ...document.metadata,
                        chunkIndex: chunks.indexOf(chunk),
                        totalChunks: chunks.length,
                        text: chunk,
                    },
                });
            }
            logger_1.logger.info(`Document ${document.id} added successfully`);
        }
        catch (error) {
            logger_1.logger.error(`Error adding document ${document.id}:`, error);
            throw error;
        }
    }
    async search(query, k = 5) {
        try {
            logger_1.logger.info(`Searching for: ${query}`);
            const results = await this.vectorStore.searchSimilar(query, k);
            return results.map((result) => ({
                text: result.content,
                score: 1.0, // TODO: Implement proper scoring
                metadata: result.metadata,
            }));
        }
        catch (error) {
            logger_1.logger.error('Error searching:', error);
            throw error;
        }
    }
    async deleteDocument(documentId) {
        try {
            logger_1.logger.info(`Deleting document: ${documentId}`);
            await this.vectorStore.deleteDocument(documentId);
            logger_1.logger.info(`Document ${documentId} deleted successfully`);
        }
        catch (error) {
            logger_1.logger.error(`Error deleting document ${documentId}:`, error);
            throw error;
        }
    }
    async cleanup() {
        try {
            await this.vectorStore.cleanup();
            logger_1.logger.info('RAGService cleaned up successfully');
        }
        catch (error) {
            logger_1.logger.error('Error cleaning up RAGService:', error);
            throw error;
        }
    }
    async checkHealth() {
        try {
            const stats = await this.vectorStore.getStats();
            return stats.totalDocuments > 0;
        }
        catch (error) {
            logger_1.logger.error('Health check failed:', error);
            return false;
        }
    }
}
exports.RAGService = RAGService;
//# sourceMappingURL=RAGService.js.map