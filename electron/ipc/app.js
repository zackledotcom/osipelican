"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const logger_1 = require("../utils/logger");
const ollama = require('ollama');
electron_1.ipcMain.handle('app:health-check', async () => {
    try {
        const status = await ollama.checkConnection();
        return {
            status: status.status === 'connected' ? 'healthy' : 'unhealthy',
            timestamp: Date.now(),
            details: {
                ollamaConnected: status.status === 'connected',
                currentModel: ollama.getCurrentModel()
            }
        };
    }
    catch (error) {
        logger_1.logger.error('Health check failed:', error);
        return {
            status: 'unhealthy',
            timestamp: Date.now(),
            details: {
                ollamaConnected: false,
                currentModel: ''
            }
        };
    }
});
electron_1.ipcMain.handle('app:retry-service', async (_, { serviceName }) => {
    try {
        // Implement service retry logic here
        return true;
    }
    catch (error) {
        logger_1.logger.error(`Failed to retry service ${serviceName}:`, error);
        return false;
    }
});
electron_1.ipcMain.handle('app:show-setup-guide', () => {
    // Implement setup guide display logic
});
electron_1.ipcMain.handle('app:show-troubleshooter', () => {
    // Implement troubleshooter display logic
});
