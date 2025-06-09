"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmbeddingService = void 0;
const Service_1 = require("./Service");
const node_fetch_1 = __importDefault(require("node-fetch"));
class EmbeddingService extends Service_1.BaseService {
    constructor(config) {
        super(config);
        this.baseUrl = config.config?.baseUrl || 'http://localhost:11434/api';
        this.defaultModel = config.config?.defaultModel || 'nomic-embed-text';
    }
    static getInstance() {
        if (!EmbeddingService.instance) {
            EmbeddingService.instance = new EmbeddingService({ name: 'embedding', config: {} });
        }
        return EmbeddingService.instance;
    }
    async initialize() {
        try {
            await this.getEmbedding('test');
            this.logger.info('Embedding service initialized successfully');
        }
        catch (error) {
            if (error instanceof Error) {
                this.logger.error('Failed to initialize embedding service:', error);
                throw new Error(`Failed to initialize embedding service: ${error.message}`);
            }
            throw error;
        }
    }
    async cleanup() {
        // Nothing to clean up currently
    }
    async checkHealth() {
        try {
            await this.getEmbedding('healthcheck');
            return true;
        }
        catch {
            return false;
        }
    }
    async getEmbedding(text, model) {
        try {
            const requestBody = {
                model: model || this.defaultModel,
                prompt: text,
            };
            const response = await (0, node_fetch_1.default)(`${this.baseUrl}/embeddings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Embedding API error (${response.status}): ${errorText}`);
            }
            const data = await response.json();
            return data.embedding;
        }
        catch (error) {
            if (error instanceof Error) {
                this.logger.error('Error getting embedding:', error);
                throw error;
            }
            throw error;
        }
    }
}
exports.EmbeddingService = EmbeddingService;
