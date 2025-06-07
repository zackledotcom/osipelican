"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatService = void 0;
const OllamaService_1 = require("./OllamaService");
const VectorStoreService_1 = require("./VectorStoreService");
const logger_1 = require("../utils/logger");
const ipc_1 = require("../types/ipc");
const uuid_1 = require("uuid");
class ChatService {
    constructor(ollamaService, vectorStoreService) {
        this.conversations = new Map();
        this.ollamaService = ollamaService;
        this.vectorStoreService = vectorStoreService;
    }
    static getInstance() {
        if (!ChatService.instance) {
            const ollamaService = OllamaService_1.OllamaService.getInstance();
            const vectorStoreService = VectorStoreService_1.VectorStoreService.getInstance();
            ChatService.instance = new ChatService(ollamaService, vectorStoreService);
        }
        return ChatService.instance;
    }
    async initialize() {
        logger_1.logger.info('Initializing ChatService');
    }
    async sendMessage(message) {
        try {
            // Search for relevant documents
            const relevantDocs = await this.vectorStoreService.searchSimilar(message.content);
            // Create context from relevant documents
            const context = relevantDocs
                .map(doc => `[Source: ${doc.metadata.source}]\n${doc.content}`)
                .join('\n\n');
            // Create prompt with context
            const prompt = context
                ? `Context:\n${context}\n\nQuestion: ${message.content}\n\nAnswer:`
                : message.content;
            // Generate response using Ollama
            const { content: responseContent } = await this.ollamaService.generateResponse(prompt);
            // Create response message
            const responseMessage = {
                id: (0, uuid_1.v4)(),
                role: ipc_1.Role.Assistant,
                content: responseContent,
                timestamp: Date.now(),
            };
            // Store the conversation in vector store
            await this.vectorStoreService.addDocument({
                content: message.content,
                metadata: {
                    source: 'user_message',
                    timestamp: Date.now(),
                    type: 'chat',
                },
            });
            await this.vectorStoreService.addDocument({
                content: responseContent,
                metadata: {
                    source: 'assistant_response',
                    timestamp: Date.now(),
                    type: 'chat',
                },
            });
            return responseMessage;
        }
        catch (error) {
            logger_1.logger.error('Error sending message:', error);
            throw error;
        }
    }
    async sendMessageStream(message) {
        try {
            // Search for relevant documents
            const relevantDocs = await this.vectorStoreService.searchSimilar(message.content);
            // Create context from relevant documents
            const context = relevantDocs
                .map(doc => `[Source: ${doc.metadata.source}]\n${doc.content}`)
                .join('\n\n');
            // Create prompt with context
            const prompt = context
                ? `Context:\n${context}\n\nQuestion: ${message.content}\n\nAnswer:`
                : message.content;
            // Generate response using Ollama
            await this.ollamaService.generateResponse(prompt);
        }
        catch (error) {
            logger_1.logger.error('Error sending message stream:', error);
            throw error;
        }
    }
    async createConversation(title) {
        const id = (0, uuid_1.v4)();
        const conversation = {
            id,
            title,
            messages: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };
        this.conversations.set(id, conversation);
        return id;
    }
    async getConversation(id) {
        const conversation = this.conversations.get(id);
        if (!conversation) {
            throw new Error(`Conversation ${id} not found`);
        }
        return conversation.messages;
    }
    async listConversations() {
        return Array.from(this.conversations.values());
    }
    async deleteConversation(id) {
        if (!this.conversations.has(id)) {
            throw new Error(`Conversation ${id} not found`);
        }
        this.conversations.delete(id);
    }
    async updateConversationTitle(id, title) {
        const conversation = this.conversations.get(id);
        if (!conversation) {
            throw new Error(`Conversation ${id} not found`);
        }
        conversation.title = title;
        conversation.updatedAt = Date.now();
        this.conversations.set(id, conversation);
    }
}
exports.ChatService = ChatService;
//# sourceMappingURL=ChatService.js.map