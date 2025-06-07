"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerChatHandlers = registerChatHandlers;
const electron_1 = require("electron");
const OllamaClient_1 = require("../shared/api/OllamaClient");
const logger_1 = require("../utils/logger");
const ipc_1 = require("../types/ipc");
const types_1 = require("./types");
const uuid_1 = require("uuid");
const client = OllamaClient_1.OllamaClient.getInstance();
electron_1.ipcMain.handle('chat:ask', async (event, prompt) => {
    return new Promise((resolve) => {
        let reply = '';
        const message = {
            id: crypto.randomUUID(),
            role: ipc_1.Role.User,
            content: prompt,
            timestamp: Date.now()
        };
        client.sendMessageStream(message, {
            onChunk: (token) => {
                reply += token;
                event.sender.send('chat:token', token);
            },
            onComplete: () => {
                resolve(reply);
            },
            onError: (error) => {
                logger_1.logger.error('Chat error:', error);
                event.sender.send('chat:error', error.message);
                resolve('');
            }
        });
    });
});
function registerChatHandlers(chatService) {
    // Send message handler
    electron_1.ipcMain.handle(types_1.CHANNELS.CHAT.SEND_MESSAGE, async (_, request) => {
        try {
            const message = {
                id: (0, uuid_1.v4)(),
                content: request.content,
                role: ipc_1.Role.User,
                timestamp: Date.now(),
            };
            const response = await chatService.sendMessage(message);
            return {
                success: true,
                data: response,
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to send message:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
            };
        }
    });
    // Get conversations handler
    electron_1.ipcMain.handle(types_1.CHANNELS.CHAT.GET_CONVERSATIONS, async () => {
        try {
            const conversations = await chatService.listConversations();
            return {
                success: true,
                data: conversations,
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to get conversations:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
            };
        }
    });
    // Get conversation handler
    electron_1.ipcMain.handle(types_1.CHANNELS.CHAT.GET_CONVERSATION, async (_, conversationId) => {
        try {
            const messages = await chatService.getConversation(conversationId);
            return {
                success: true,
                data: {
                    id: conversationId,
                    messages,
                    title: '', // TODO: Get title from conversation
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                },
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to get conversation:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
            };
        }
    });
    // Create conversation handler
    electron_1.ipcMain.handle(types_1.CHANNELS.CHAT.CREATE_CONVERSATION, async (_, title) => {
        try {
            const conversationId = await chatService.createConversation(title);
            return {
                success: true,
                data: {
                    id: conversationId,
                    title,
                    messages: [],
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                },
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to create conversation:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
            };
        }
    });
    // Update conversation title handler
    electron_1.ipcMain.handle(types_1.CHANNELS.CHAT.UPDATE_CONVERSATION_TITLE, async (_, conversationId, title) => {
        try {
            await chatService.updateConversationTitle(conversationId, title);
            return {
                success: true,
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to update conversation title:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
            };
        }
    });
}
//# sourceMappingURL=chat.js.map