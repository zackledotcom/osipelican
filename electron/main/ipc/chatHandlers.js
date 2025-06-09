"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupChatHandlers = setupChatHandlers;
const electron_1 = require("electron");
const OllamaClient_1 = require(".././services/OllamaClient");
const DatabaseService_1 = require(".././services/DatabaseService");
const ollamaClient = new OllamaClient_1.OllamaClient();
const dbService = new DatabaseService_1.DatabaseService();
function setupChatHandlers() {
    // Send a message and get a response
    electron_1.ipcMain.handle('chat:send-message', async (_, message) => {
        try {
            const messageId = `msg-${Date.now()}`;
            // Add user message to database
            const userMessage = {
                id: messageId,
                content: message,
                role: 'user',
                timestamp: Date.now(),
                status: 'sending'
            };
            await dbService.saveMessage(userMessage);
            // Update message status to sent
            userMessage.status = 'sent';
            await dbService.saveMessage(userMessage);
            // Generate response using Ollama with streaming
            let assistantMessage = {
                id: `msg-${Date.now()}`,
                content: '',
                role: 'assistant',
                timestamp: Date.now(),
                status: 'sending'
            };
            await dbService.saveMessage(assistantMessage);
            const response = await ollamaClient.generateResponse(message, async (chunk) => {
                assistantMessage.content += chunk;
                await dbService.saveMessage(assistantMessage);
            });
            // Update final message status
            assistantMessage.status = 'sent';
            await dbService.saveMessage(assistantMessage);
            return assistantMessage;
        }
        catch (error) {
            console.error('Error in chat:send-message:', error);
            throw error;
        }
    });
    // Get chat history
    electron_1.ipcMain.handle('chat:get-history', async () => {
        return await dbService.getMessages();
    });
    // Clear chat history
    electron_1.ipcMain.handle('chat:clear-history', async () => {
        await dbService.clearMessages();
        return { success: true };
    });
    // Delete a message
    electron_1.ipcMain.handle('chat:delete-message', async (_, messageId) => {
        await dbService.deleteMessage(messageId);
        return { success: true };
    });
    // Get available models
    electron_1.ipcMain.handle('chat:get-models', async () => {
        return await ollamaClient.listModels();
    });
    // Set current model
    electron_1.ipcMain.handle('chat:set-model', async (_, modelName) => {
        ollamaClient.setModel(modelName);
        return { success: true };
    });
    // Pull a new model
    electron_1.ipcMain.handle('chat:pull-model', async (_, modelName) => {
        await ollamaClient.pullModel(modelName, (progress) => {
            // Send progress updates to renderer
            electron_1.ipcMain.emit('model-pull-progress', { modelName, progress });
        });
        return { success: true };
    });
}
//# sourceMappingURL=chatHandlers.js.map