"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatService = void 0;
const Service_1 = require("./Service");
const node_fetch_1 = __importDefault(require("node-fetch"));
const chat_1 = require("./types/chat");
const events_1 = require("events");
class ChatService extends Service_1.BaseService {
    constructor(config) {
        super(config);
        this.baseUrl = config.config?.baseUrl || 'http://localhost:11434/api';
        this.defaultModel = config.config?.defaultModel || 'llama3';
        this.eventEmitter = new events_1.EventEmitter();
    }
    async initialize() {
        try {
            // Test connection with a simple message
            await this.generateCompletion([{ role: chat_1.Role.User, content: 'Hello', id: '1', timestamp: Date.now() }]);
            this.logger.info('Chat service initialized successfully');
        }
        catch (error) {
            if (error instanceof Error) {
                this.logger.error('Failed to initialize chat service:', error);
                throw new Error(`Failed to initialize chat service: ${error.message}`);
            }
            throw error;
        }
    }
    async cleanup() {
        // Cleanup resources if needed
        this.eventEmitter.removeAllListeners();
    }
    async checkHealth() {
        try {
            // Simple health check by generating a completion with a test message
            await this.generateCompletion([{ role: chat_1.Role.User, content: 'Health check', id: 'health', timestamp: Date.now() }]);
            return true;
        }
        catch {
            return false;
        }
    }
    async generateCompletion(messages, options = {}) {
        try {
            const formattedMessages = messages.map(msg => ({
                role: msg.role,
                content: msg.content
            }));
            const requestBody = {
                model: options.model || this.defaultModel,
                messages: formattedMessages,
                systemPrompt: options.systemPrompt,
                temperature: options.temperature,
                maxTokens: options.maxTokens,
                stream: options.stream || false
            };
            const response = await (0, node_fetch_1.default)(`${this.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Chat API error (${response.status}): ${errorText}`);
            }
            if (options.stream) {
                // Handle streaming response
                await this.handleStreamResponse(response);
                return '';
            }
            else {
                // Handle regular response
                const data = await response.json();
                return data.choices[0].message.content;
            }
        }
        catch (error) {
            if (error instanceof Error) {
                this.logger.error('Error generating chat completion:', error);
                throw error;
            }
            throw error;
        }
    }
    async handleStreamResponse(response) {
        if (!response.body) {
            this.logger.error('Response body is null');
            return;
        }
        const decoder = new TextDecoder();
        let buffer = '';
        try {
            for await (const chunk of response.body) {
                buffer += decoder.decode(chunk, { stream: true });
                // Process complete JSON objects from the buffer
                let newlineIndex;
                while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
                    const line = buffer.slice(0, newlineIndex).trim();
                    buffer = buffer.slice(newlineIndex + 1);
                    if (line.startsWith('data: ')) {
                        const jsonStr = line.slice(6);
                        if (jsonStr === '[DONE]') {
                            this.eventEmitter.emit('done');
                            break;
                        }
                        try {
                            const data = JSON.parse(jsonStr);
                            const content = data.choices[0].delta.content || '';
                            this.eventEmitter.emit('token', content);
                            if (data.choices[0].finishReason) {
                                this.eventEmitter.emit('done');
                            }
                        }
                        catch (e) {
                            this.logger.error('Error parsing streaming response:', e);
                        }
                    }
                }
            }
        }
        catch (error) {
            if (error instanceof Error) {
                this.logger.error('Error processing stream:', error);
                this.eventEmitter.emit('error', error);
            }
        }
    }
    onToken(callback) {
        this.eventEmitter.on('token', callback);
    }
    onDone(callback) {
        this.eventEmitter.on('done', callback);
    }
    onError(callback) {
        this.eventEmitter.on('error', callback);
    }
    // New methods for conversation management
    async createConversation(title, tags, topic) {
        // Stub implementation: generate a new UUID as conversation ID
        const id = crypto.randomUUID();
        // TODO: Persist the conversation with title, tags, topic
        this.logger.info(`Created conversation ${id} with title "${title}", tags ${JSON.stringify(tags)}, topic "${topic}"`);
        return id;
    }
    async getConversation(id) {
        // Stub implementation: return a dummy conversation
        return {
            id,
            title: 'Dummy Conversation',
            messages: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
            tags: [],
        };
    }
    async listConversations() {
        // Stub implementation: return an empty list
        return [];
    }
    async updateConversationTitle(id, title) {
        // Stub implementation: log update
        this.logger.info(`Updated conversation ${id} title to "${title}"`);
    }
    async updateConversation(id, title, tags, topic) {
        // Stub implementation: log update
        this.logger.info(`Updated conversation ${id} with title "${title}", tags ${JSON.stringify(tags)}, topic "${topic}"`);
    }
}
exports.ChatService = ChatService;
