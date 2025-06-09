"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerOllamaHandlers = registerOllamaHandlers;
const electron_1 = require("electron");
const types_1 = require("./types");
const logger_1 = require("../utils/logger");
function registerOllamaHandlers(ollamaService) {
    // List models handler
    electron_1.ipcMain.handle(types_1.CHANNELS.OLLAMA.LIST_MODELS, async () => {
        try {
            const { models } = await ollamaService.listModels();
            return {
                success: true,
                data: { models },
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to list models:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
            };
        }
    });
    // Set model handler
    electron_1.ipcMain.handle(types_1.CHANNELS.OLLAMA.SET_MODEL, async (_, modelName) => {
        try {
            await ollamaService.setModel(modelName);
            return {
                success: true,
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to set model:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
            };
        }
    });
    // Check connection handler
    electron_1.ipcMain.handle(types_1.CHANNELS.OLLAMA.CHECK_CONNECTION, async () => {
        try {
            const status = await ollamaService.getStatus();
            const connectionStatus = {
                connected: status === 'running',
                error: status === 'error' ? 'Service error' : undefined,
            };
            return {
                success: true,
                data: connectionStatus,
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to check connection:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
            };
        }
    });
    // Save config handler
    electron_1.ipcMain.handle(types_1.CHANNELS.OLLAMA.SAVE_CONFIG, async (_, config) => {
        try {
            if ('model' in config && typeof config.model === 'string') {
                await ollamaService.setModel(config.model);
            }
            return {
                success: true,
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to save config:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
            };
        }
    });
}
//# sourceMappingURL=ollama.js.map
