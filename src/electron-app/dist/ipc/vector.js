"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupVectorIpcHandlers = setupVectorIpcHandlers;
const electron_1 = require("electron");
const VectorStore_1 = require("../services/VectorStore");
const logger_1 = require("../utils/logger");
function setupVectorIpcHandlers() {
    electron_1.ipcMain.handle('vector:search', async (_, query) => {
        try {
            return await VectorStore_1.vectorStore.search(query);
        }
        catch (error) {
            logger_1.logger.error('Error searching vectors:', error);
            throw error;
        }
    });
    electron_1.ipcMain.handle('vector:add', async (_, doc) => {
        try {
            await VectorStore_1.vectorStore.add(doc);
        }
        catch (error) {
            logger_1.logger.error('Error adding vector:', error);
            throw error;
        }
    });
    electron_1.ipcMain.handle('vector:delete', async (_, id) => {
        try {
            await VectorStore_1.vectorStore.delete(id);
        }
        catch (error) {
            logger_1.logger.error('Error deleting vector:', error);
            throw error;
        }
    });
    electron_1.ipcMain.handle('vector:clear', async () => {
        try {
            await VectorStore_1.vectorStore.clear();
        }
        catch (error) {
            logger_1.logger.error('Error clearing vectors:', error);
            throw error;
        }
    });
    electron_1.ipcMain.handle('vector:stats', async () => {
        try {
            return await VectorStore_1.vectorStore.stats();
        }
        catch (error) {
            logger_1.logger.error('Error getting vector stats:', error);
            throw error;
        }
    });
}
//# sourceMappingURL=vector.js.map