import { ipcMain } from 'electron';
import { dialog } from 'electron';

interface MemoryNode {
  id: string;
  title: string;
  model: string;
  isLinked: boolean;
  linkedMessageId?: string;
}

// In-memory storage for memory nodes
const memoryNodes = new Map<string, MemoryNode>();

export function setupMemoryHandlers() {
  // Create a new memory node
  ipcMain.handle('memory:create', async (_, node: MemoryNode) => {
    try {
      memoryNodes.set(node.id, node);
      return { success: true, node };
    } catch (error) {
      console.error('Failed to create memory node:', error);
      throw error;
    }
  });

  // Delete a memory node
  ipcMain.handle('memory:delete', async (_, { id }: { id: string }) => {
    try {
      const node = memoryNodes.get(id);
      if (!node) {
        throw new Error('Memory node not found');
      }
      memoryNodes.delete(id);
      return { success: true };
    } catch (error) {
      console.error('Failed to delete memory node:', error);
      throw error;
    }
  });

  // Show message selection dialog
  ipcMain.handle('memory:select-message', async () => {
    try {
      // TODO: Implement message selection dialog
      // For now, return a mock message ID
      return { messageId: 'msg-' + Date.now() };
    } catch (error) {
      console.error('Failed to select message:', error);
      throw error;
    }
  });

  // Get all memory nodes
  ipcMain.handle('memory:get-all', async () => {
    try {
      return Array.from(memoryNodes.values());
    } catch (error) {
      console.error('Failed to get memory nodes:', error);
      throw error;
    }
  });
} 