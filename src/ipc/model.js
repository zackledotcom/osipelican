"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const OllamaClient_1 = require("../shared/api/OllamaClient");
const logger_1 = require("../utils/logger");
const client = OllamaClient_1.OllamaClient.getInstance();
electron_1.ipcMain.handle('model:list', async () => {
    try {
        return await client.listModels();
    }
    catch (error) {
        logger_1.logger.error('Error listing models:', error);
        throw error;
    }
});
electron_1.ipcMain.handle('model:set', async (_, name) => {
    try {
        await client.setModel(name);
        return true;
    }
    catch (error) {
        logger_1.logger.error('Error setting model:', error);
        throw error;
    }
});
electron_1.ipcMain.handle('model:get', () => {
    return client.getCurrentModel();
});
//# sourceMappingURL=model.js.map