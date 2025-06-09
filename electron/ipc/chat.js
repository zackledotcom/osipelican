"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerChatHandlers = registerChatHandlers;
const electron_1 = require("electron");
const logger_1 = require("../utils/logger");
const chat_1 = require("../types/chat");
const types_1 = require("./types");
const uuid_1 = require("uuid");
const ollama = require('ollama');
electron_1.ipcMain.handle('chat:ask', async (event, prompt) => {
    return new Promise((resolve) => {
        let reply = '';
        const message = {
            id: crypto.randomUUID(),
            role: chat_1.Role.User,
            content: prompt,
            timestamp: Date.now()
        };
        ollama.generate({ prompt: message })
            .then((response) => {
            response.on('data', (chunk) => {
                reply += chunk;
                event.sender.send('chat:token', chunk);
            });
            response.on('end', () => {
                resolve(reply);
            });
            response.on('error', (error) => {
                logger_1.logger.error('Chat error:', error);
                event.sender.send('chat:error', error.message);
                resolve('');
            });
        })
            .catch((error) => {
            logger_1.logger.error('Chat error:', error);
            event.sender.send('chat:error', error.message);
            resolve('');
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
                role: chat_1.Role.User,
                timestamp: Date.now(),
            };
            const response = await chatService.generateCompletion([message]);
            return {
                success: true,
                data: {
                    ...message,
                    content: response,
                },
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
            const conversation = await chatService.getConversation(conversationId);
            return {
                success: true,
                data: conversation,
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
    electron_1.ipcMain.handle(types_1.CHANNELS.CHAT.CREATE_CONVERSATION, async (_, request) => {
        try {
            const conversationId = await chatService.createConversation(request.title, request.tags, request.topic);
            return {
                success: true,
                data: {
                    id: conversationId,
                    title: request.title,
                    tags: request.tags,
                    topic: request.topic,
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
    // Update conversation handler (for title, tags, topic)
    // ipcMain.handle(
    //   CHANNELS.CHAT.UPDATE_CONVERSATION,
    //   async (_, request: Chat.UpdateConversationRequest): Promise<Chat.UpdateConversationResponse> => {
    //     try {
    //       await chatService.updateConversation(request.id, request.title, request.tags, request.topic);
    //       return {
    //         success: true,
    //       };
    //     } catch (error) {
    //       logger.error('Failed to update conversation:', error);
    //       return {
    //         success: false,
    //         error: error instanceof Error ? error.message : 'Unknown error occurred',
    //       };
    //     }
    //   }
    // );
}
