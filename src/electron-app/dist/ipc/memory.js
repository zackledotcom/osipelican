"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerMemoryHandlers = registerMemoryHandlers;
const electron_1 = require("electron");
const types_1 = require("./types");
const logger_1 = require("../utils/logger");
const uuid_1 = require("uuid");
function registerMemoryHandlers(memoryService) {
    // Get recent memories handler
    electron_1.ipcMain.handle(types_1.CHANNELS.MEMORY.GET_RECENT, async (_, limit = 10) => {
        try {
            const memories = await memoryService.getRecent(limit);
            return {
                success: true,
                data: memories,
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to get recent memories:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
            };
        }
    });
    // Store memory handler
    electron_1.ipcMain.handle(types_1.CHANNELS.MEMORY.STORE, async (_, memory) => {
        try {
            const memoryWithId = {
                ...memory,
                id: (0, uuid_1.v4)(),
            };
            await memoryService.store(memoryWithId);
            return {
                success: true,
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to store memory:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
            };
        }
    });
    // Delete memory handler
    electron_1.ipcMain.handle(types_1.CHANNELS.MEMORY.DELETE, async (_, id) => {
        try {
            await memoryService.delete(id);
            return {
                success: true,
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to delete memory:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
            };
        }
    });
    // Clear memories handler
    electron_1.ipcMain.handle(types_1.CHANNELS.MEMORY.CLEAR, async () => {
        try {
            await memoryService.clear();
            return {
                success: true,
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to clear memories:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
            };
        }
    });
    // Get stats handler
    electron_1.ipcMain.handle(types_1.CHANNELS.MEMORY.GET_STATS, async () => {
        try {
            const stats = await memoryService.getStats();
            return {
                success: true,
                data: stats,
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to get memory stats:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
            };
        }
    });
}
//# sourceMappingURL=memory.js.map