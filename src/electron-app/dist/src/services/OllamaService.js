"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OllamaService = void 0;
const uuid_1 = require("uuid");
const events_1 = require("events");
const OllamaClient_1 = require("./OllamaClient");
const logger_1 = require("../utils/logger");
const chat_1 = require("@shared/types/chat");
const responseMonitor_1 = require("../utils/responseMonitor");
const Service_1 = require("./Service");
class OllamaService extends Service_1.BaseService {
    constructor(config) {
        super(config);
        this.fallbackResponses = new Map([
            ['error', 'I apologize, but I am currently unable to process your request. The Ollama service is temporarily unavailable.'],
            ['greeting', 'Hello! I am currently operating in limited mode. Some features may be unavailable.'],
            ['help', 'I can help you with basic tasks, but advanced features are currently unavailable due to service limitations.']
        ]);
        this.BASE_URL = 'http://localhost:11434';
        this.isInitialized = false;
        this.client = new OllamaClient_1.OllamaClient();
        this.currentModel = '';
        this.responseMonitor = responseMonitor_1.ResponseMonitor.getInstance();
        this.eventEmitter = new events_1.EventEmitter();
        // Forward model loading state changes from the client
        this.eventEmitter.on('modelLoading', (model) => {
            this.emit('modelLoading', model);
        });
        this.eventEmitter.on('modelLoaded', (model) => {
            this.emit('modelLoaded', model);
        });
    }
    static getInstance() {
        if (!OllamaService.instance) {
            OllamaService.instance = new OllamaService({
                name: 'ollama',
                autoStart: true,
                restartOnCrash: true,
                maxRestarts: 3,
                restartDelay: 1000,
            });
        }
        return OllamaService.instance;
    }
    async initialize() {
        if (this.isInitialized)
            return;
        try {
            logger_1.logger.info('Initializing OllamaService');
            const isAvailable = await this.isAvailable();
            if (!isAvailable) {
                throw new Error('Ollama service is not available');
            }
            this.isInitialized = true;
            this.emit('initialized');
            logger_1.logger.info('OllamaService initialized successfully');
        }
        catch (error) {
            logger_1.logger.error('Error initializing OllamaService:', error);
            throw error;
        }
    }
    async isAvailable() {
        try {
            const response = await fetch(`${this.BASE_URL}/api/tags`);
            return response.ok;
        }
        catch (error) {
            logger_1.logger.warn('Ollama service is not available:', error);
            return false;
        }
    }
    async cleanup() {
        if (!this.isInitialized)
            return;
        this.isInitialized = false;
    }
    async checkHealth() {
        return await this.isAvailable();
    }
    getFallbackResponse(message) {
        // Simple keyword matching for fallback responses
        const lowerMessage = message.toLowerCase();
        let responseType = 'error';
        if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
            responseType = 'greeting';
        }
        else if (lowerMessage.includes('help') || lowerMessage.includes('what can you do')) {
            responseType = 'help';
        }
        return {
            id: (0, uuid_1.v4)(),
            content: this.fallbackResponses.get(responseType) || this.fallbackResponses.get('error'),
            role: chat_1.Role.Assistant,
            timestamp: Date.now()
        };
    }
    async listModels() {
        try {
            const response = await fetch(`${this.BASE_URL}/api/tags`);
            if (!response.ok) {
                throw new Error(`Failed to list models: ${response.statusText}`);
            }
            const data = await response.json();
            return data.models.map((model) => model.name);
        }
        catch (error) {
            logger_1.logger.error('Error listing models:', error);
            throw error;
        }
    }
    async setModel(modelName) {
        try {
            this.client.setModel(modelName);
            this.currentModel = modelName;
        }
        catch (error) {
            this.logger.error('Error setting model:', error);
            throw error;
        }
    }
    getCurrentModel() {
        return this.currentModel;
    }
    async cancelLoad() {
        try {
            // No cancel load method in OllamaClient
        }
        catch (error) {
            this.logger.error('Error canceling load:', error);
            throw error;
        }
    }
    async callOllama(prompt) {
        const isConnected = await this.client.checkConnection();
        if (!isConnected) {
            throw new Error('Ollama service is not available');
        }
        const response = await this.client.generateResponse(prompt);
        return response.content;
    }
    async generateResponse(prompt, context) {
        const startTime = Date.now();
        try {
            // Get response from Ollama
            const response = await this.callOllama(prompt);
            // Analyze response quality
            const metrics = await this.responseMonitor.analyzeResponse(response, context, startTime, this.estimateTokenCount(response));
            // Handle quality issues
            if (metrics.isTruncated || metrics.potentialHallucinations.length > 0) {
                this.logger.warn('Response quality issues detected:', metrics);
                // If truncated, try to get a complete response
                if (metrics.isTruncated) {
                    return await this.handleTruncation(prompt, context);
                }
                // If hallucinations detected, try to get a more accurate response
                if (metrics.potentialHallucinations.length > 0) {
                    return await this.handleHallucinations(prompt, context, metrics);
                }
            }
            return response;
        }
        catch (error) {
            this.logger.error('Error generating response:', error);
            throw error;
        }
    }
    async handleTruncation(prompt, context) {
        // Implement truncation handling strategy
        this.logger.info('Handling truncated response...');
        // Try with a shorter prompt
        const shorterPrompt = this.shortenPrompt(prompt);
        return await this.callOllama(shorterPrompt);
    }
    async handleHallucinations(prompt, context, metrics) {
        // Implement hallucination handling strategy
        this.logger.info('Handling potential hallucinations...');
        // Try with reinforced context
        const reinforcedPrompt = this.reinforceContext(prompt, context);
        return await this.callOllama(reinforcedPrompt);
    }
    shortenPrompt(prompt) {
        // Implement prompt shortening logic
        return prompt.split('\n').slice(0, 3).join('\n');
    }
    reinforceContext(prompt, context) {
        // Implement context reinforcement logic
        return `${context}\n\n${prompt}`;
    }
    estimateTokenCount(text) {
        // Implement token estimation logic
        return Math.ceil(text.length / 4);
    }
    isServiceAvailable() {
        return this.status === Service_1.ServiceStatus.RUNNING;
    }
    getConnectionStatus() {
        return {
            isConnected: this.status === Service_1.ServiceStatus.RUNNING,
            isFallbackMode: this.status === Service_1.ServiceStatus.ERROR,
            lastSuccessfulConnection: this.startTime,
            connectionAttempts: this.restartAttempts
        };
    }
    async pullModel(modelName) {
        try {
            const response = await fetch(`${this.BASE_URL}/api/pull`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: modelName,
                }),
            });
            if (!response.ok) {
                throw new Error(`Failed to pull model: ${response.statusText}`);
            }
            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error('Failed to get response reader');
            }
            while (true) {
                const { done, value } = await reader.read();
                if (done)
                    break;
                // Process streaming response if needed
            }
        }
        catch (error) {
            logger_1.logger.error('Error pulling model:', error);
            throw error;
        }
    }
    async generateEmbedding(text, modelName) {
        try {
            const response = await fetch(`${this.BASE_URL}/api/embeddings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: modelName,
                    prompt: text,
                }),
            });
            if (!response.ok) {
                throw new Error(`Failed to generate embedding: ${response.statusText}`);
            }
            return await response.json();
        }
        catch (error) {
            logger_1.logger.error('Error generating embedding:', error);
            throw error;
        }
    }
}
exports.OllamaService = OllamaService;
//# sourceMappingURL=OllamaService.js.map