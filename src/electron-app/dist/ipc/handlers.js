"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupIpcHandlers = setupIpcHandlers;
const electron_1 = require("electron");
const OllamaClient_1 = require("../shared/api/OllamaClient");
const MessageStore_1 = require("../services/MessageStore");
const MemoryService_1 = require("../services/MemoryService");
const channels_1 = require("./channels");
const OllamaService_1 = require("../services/OllamaService");
const VectorStoreService_1 = require("../services/VectorStoreService");
const logger_1 = require("../utils/logger");
const ChatService_1 = require("../services/ChatService");
const EmbeddingService_1 = require("../services/EmbeddingService");
const ServiceManager_1 = require("../services/ServiceManager");
const client = OllamaClient_1.OllamaClient.getInstance();
const messageStore = new MessageStore_1.MessageStore();
const serviceManager = ServiceManager_1.ServiceManager.getInstance();
// Initialize services
const ollamaService = OllamaService_1.OllamaService.getInstance();
const embeddingService = EmbeddingService_1.EmbeddingService.getInstance();
const vectorStoreService = VectorStoreService_1.VectorStoreService.getInstance();
const memoryService = MemoryService_1.MemoryService.getInstance();
const chatService = ChatService_1.ChatService.getInstance();
let isInitialized = false;
// Helper function to check service availability
const withServiceCheck = async (serviceName, fn) => {
    try {
        const result = await fn();
        return { success: true, result };
    }
    catch (error) {
        console.error(`Service ${serviceName} error:`, error);
        return {
            success: false,
            error: error instanceof Error ? error.message : `Service ${serviceName} error`
        };
    }
};
async function setupIpcHandlers() {
    if (isInitialized) {
        return;
    }
    isInitialized = true;
    // Initialize services
    await messageStore.initialize();
    await memoryService.initialize();
    await vectorStoreService.initialize();
    await ollamaService.initialize();
    await embeddingService.initialize();
    await chatService.initialize();
    // Chat message handler with RAG
    electron_1.ipcMain.handle(channels_1.IPC_CHANNELS.CHAT.SEND_MESSAGE, async (_event, message) => {
        try {
            return await chatService.sendMessage(message);
        }
        catch (error) {
            logger_1.logger.error('Error sending message:', error);
            throw error;
        }
    });
    electron_1.ipcMain.handle(channels_1.IPC_CHANNELS.CHAT.SEND_MESSAGE_STREAM, async (_event, message) => {
        try {
            await chatService.sendMessageStream(message);
        }
        catch (error) {
            logger_1.logger.error('Error sending message stream:', error);
            throw error;
        }
    });
    electron_1.ipcMain.handle(channels_1.IPC_CHANNELS.CHAT.CREATE_CONVERSATION, async (_event, title) => {
        try {
            return await chatService.createConversation(title);
        }
        catch (error) {
            logger_1.logger.error('Error creating conversation:', error);
            throw error;
        }
    });
    electron_1.ipcMain.handle(channels_1.IPC_CHANNELS.CHAT.GET_CONVERSATION, async (_event, id) => {
        try {
            return await chatService.getConversation(id);
        }
        catch (error) {
            logger_1.logger.error('Error getting conversation:', error);
            throw error;
        }
    });
    electron_1.ipcMain.handle(channels_1.IPC_CHANNELS.CHAT.GET_CONVERSATIONS, async () => {
        try {
            return await chatService.listConversations();
        }
        catch (error) {
            logger_1.logger.error('Error listing conversations:', error);
            throw error;
        }
    });
    electron_1.ipcMain.handle(channels_1.IPC_CHANNELS.CHAT.DELETE_CONVERSATION, async (_event, id) => {
        try {
            await chatService.deleteConversation(id);
        }
        catch (error) {
            logger_1.logger.error('Error deleting conversation:', error);
            throw error;
        }
    });
    electron_1.ipcMain.handle(channels_1.IPC_CHANNELS.CHAT.UPDATE_CONVERSATION_TITLE, async (_event, id, title) => {
        try {
            await chatService.updateConversationTitle(id, title);
        }
        catch (error) {
            logger_1.logger.error('Error updating conversation title:', error);
            throw error;
        }
    });
    // Ollama model handlers
    electron_1.ipcMain.handle(channels_1.IPC_CHANNELS.OLLAMA.LIST_MODELS, () => withServiceCheck('ollama', async () => {
        const service = OllamaService_1.OllamaService.getInstance();
        return service.listModels();
    }));
    electron_1.ipcMain.handle(channels_1.IPC_CHANNELS.OLLAMA.SET_MODEL, (_, modelName) => withServiceCheck('ollama', async () => {
        const service = OllamaService_1.OllamaService.getInstance();
        return service.setModel(modelName);
    }));
    electron_1.ipcMain.handle(channels_1.IPC_CHANNELS.OLLAMA.CHECK_CONNECTION, () => withServiceCheck('ollama', async () => {
        const service = OllamaService_1.OllamaService.getInstance();
        return service.checkConnection();
    }));
    electron_1.ipcMain.handle(channels_1.IPC_CHANNELS.OLLAMA.CANCEL_LOAD, () => withServiceCheck('ollama', async () => {
        const service = OllamaService_1.OllamaService.getInstance();
        return service.cancelLoad();
    }));
    // Embedding configuration handlers
    electron_1.ipcMain.handle(channels_1.IPC_CHANNELS.EMBEDDING.GET_CONFIG, () => withServiceCheck('embedding', async () => {
        const service = EmbeddingService_1.EmbeddingService.getInstance();
        return service.getConfig();
    }));
    electron_1.ipcMain.handle(channels_1.IPC_CHANNELS.EMBEDDING.UPDATE_CONFIG, (_, config) => withServiceCheck('embedding', async () => {
        const service = EmbeddingService_1.EmbeddingService.getInstance();
        return service.updateConfig(config);
    }));
    // Vector store handlers
    electron_1.ipcMain.handle(channels_1.IPC_CHANNELS.VECTOR.SEARCH, (_, query) => withServiceCheck('vectorStore', async () => {
        const service = VectorStoreService_1.VectorStoreService.getInstance();
        return service.searchSimilar(query);
    }));
    electron_1.ipcMain.handle(channels_1.IPC_CHANNELS.VECTOR.ADD, (_, document) => withServiceCheck('vectorStore', async () => {
        const service = VectorStoreService_1.VectorStoreService.getInstance();
        return service.addDocument(document);
    }));
    electron_1.ipcMain.handle(channels_1.IPC_CHANNELS.VECTOR.DELETE, (_, id) => withServiceCheck('vectorStore', async () => {
        const service = VectorStoreService_1.VectorStoreService.getInstance();
        return service.deleteDocument(id);
    }));
    electron_1.ipcMain.handle(channels_1.IPC_CHANNELS.VECTOR.CLEAR, () => withServiceCheck('vectorStore', async () => {
        const service = VectorStoreService_1.VectorStoreService.getInstance();
        return service.clear();
    }));
    // Memory service handlers
    electron_1.ipcMain.handle(channels_1.IPC_CHANNELS.MEMORY.INITIALIZE, () => withServiceCheck('memory', async () => {
        const service = MemoryService_1.MemoryService.getInstance();
        return service.initialize();
    }));
    electron_1.ipcMain.handle(channels_1.IPC_CHANNELS.MEMORY.STORE, async (_, chunk) => {
        try {
            const memoryService = MemoryService_1.MemoryService.getInstance();
            await memoryService.store(chunk);
            return { success: true };
        }
        catch (error) {
            console.error('Failed to store memory:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to store memory'
            };
        }
    });
    electron_1.ipcMain.handle(channels_1.IPC_CHANNELS.MEMORY.SEARCH, async (_, query) => {
        try {
            const memoryService = MemoryService_1.MemoryService.getInstance();
            const results = await memoryService.search(query);
            return { success: true, results };
        }
        catch (error) {
            console.error('Failed to search memories:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to search memories'
            };
        }
    });
    electron_1.ipcMain.handle(channels_1.IPC_CHANNELS.MEMORY.GET_RECENT, async (_, limit = 10) => {
        try {
            const memoryService = MemoryService_1.MemoryService.getInstance();
            const results = await memoryService.getRecent(limit);
            return { success: true, results };
        }
        catch (error) {
            console.error('Failed to get recent memories:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get recent memories'
            };
        }
    });
    electron_1.ipcMain.handle(channels_1.IPC_CHANNELS.MEMORY.DELETE, async (_, id) => {
        try {
            const memoryService = MemoryService_1.MemoryService.getInstance();
            await memoryService.delete(id);
            return { success: true };
        }
        catch (error) {
            console.error('Failed to delete memory:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to delete memory'
            };
        }
    });
    electron_1.ipcMain.handle(channels_1.IPC_CHANNELS.MEMORY.CLEAR, async () => {
        try {
            const memoryService = MemoryService_1.MemoryService.getInstance();
            await memoryService.clear();
            return { success: true };
        }
        catch (error) {
            console.error('Failed to clear memories:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to clear memories'
            };
        }
    });
    // Memory service event listeners
    memoryService.on('initialized', () => {
        // Notify all windows
        electron_1.BrowserWindow.getAllWindows().forEach((window) => {
            window.webContents.send(channels_1.IPC_CHANNELS.MEMORY.INITIALIZE);
        });
    });
    memoryService.on('stored', (memory) => {
        electron_1.BrowserWindow.getAllWindows().forEach((window) => {
            window.webContents.send(channels_1.IPC_CHANNELS.MEMORY.STORE, memory);
        });
    });
    memoryService.on('searched', (memories) => {
        electron_1.BrowserWindow.getAllWindows().forEach((window) => {
            window.webContents.send(channels_1.IPC_CHANNELS.MEMORY.SEARCH, memories);
        });
    });
    memoryService.on('recent', (memories) => {
        electron_1.BrowserWindow.getAllWindows().forEach((window) => {
            window.webContents.send(channels_1.IPC_CHANNELS.MEMORY.GET_RECENT, memories);
        });
    });
    memoryService.on('deleted', (id) => {
        electron_1.BrowserWindow.getAllWindows().forEach((window) => {
            window.webContents.send(channels_1.IPC_CHANNELS.MEMORY.DELETE, id);
        });
    });
    memoryService.on('cleared', () => {
        electron_1.BrowserWindow.getAllWindows().forEach((window) => {
            window.webContents.send(channels_1.IPC_CHANNELS.MEMORY.CLEAR);
        });
    });
    // Service status handlers
    electron_1.ipcMain.handle(channels_1.IPC_CHANNELS.APP.HEALTH_CHECK, () => {
        const statuses = serviceManager.getAllServiceStatuses();
        return Object.fromEntries(statuses);
    });
    // Setup event listeners for service status changes
    serviceManager.on('serviceStatusChanged', ({ serviceName, status, error }) => {
        electron_1.BrowserWindow.getAllWindows().forEach((window) => {
            window.webContents.send(channels_1.IPC_CHANNELS.APP.SERVICE_STATUS_CHANGED, {
                serviceName,
                status,
                error,
            });
        });
    });
    // Start health check monitoring
    client.startHealthCheck();
    // Cleanup on app quit
    process.on('exit', () => {
        client.stopHealthCheck();
    });
}
//# sourceMappingURL=handlers.js.map