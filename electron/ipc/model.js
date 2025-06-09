"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const logger_1 = require("./utils/logger");
const ollama = require('ollama');
electron_1.ipcMain.handle('model:list', async () => {
    try {
        return await ollama.listModels();
    }
    catch (error) {
        logger_1.logger.error('Error listing models:', error);
        throw error;
    }
});
electron_1.ipcMain.handle('model:set', async (_, name) => {
    try {
        await ollama.setModel(name);
        return true;
    }
    catch (error) {
        logger_1.logger.error('Error setting model:', error);
        throw error;
    }
});
electron_1.ipcMain.handle('model:get', () => {
    return ollama.getCurrentModel();
});
