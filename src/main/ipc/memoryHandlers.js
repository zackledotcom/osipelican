"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupMemoryHandlers = setupMemoryHandlers;
const electron_1 = require("electron");
// In-memory storage for memory nodes
const memoryNodes = new Map();
function setupMemoryHandlers() {
    // Create a new memory node
    electron_1.ipcMain.handle('memory:create', async (_, node) => {
        try {
            memoryNodes.set(node.id, node);
            return { success: true, node };
        }
        catch (error) {
            console.error('Failed to create memory node:', error);
            throw error;
        }
    });
    // Delete a memory node
    electron_1.ipcMain.handle('memory:delete', async (_, { id }) => {
        try {
            const node = memoryNodes.get(id);
            if (!node) {
                throw new Error('Memory node not found');
            }
            memoryNodes.delete(id);
            return { success: true };
        }
        catch (error) {
            console.error('Failed to delete memory node:', error);
            throw error;
        }
    });
    // Show message selection dialog
    electron_1.ipcMain.handle('memory:select-message', async () => {
        try {
            // TODO: Implement message selection dialog
            // For now, return a mock message ID
            return { messageId: 'msg-' + Date.now() };
        }
        catch (error) {
            console.error('Failed to select message:', error);
            throw error;
        }
    });
    // Get all memory nodes
    electron_1.ipcMain.handle('memory:get-all', async () => {
        try {
            return Array.from(memoryNodes.values());
        }
        catch (error) {
            console.error('Failed to get memory nodes:', error);
            throw error;
        }
    });
}
//# sourceMappingURL=memoryHandlers.js.map