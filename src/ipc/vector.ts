import { ipcMain } from 'electron';
import { vectorStore } from '../services/VectorStore';
import { logger } from '../utils/logger';

export function setupVectorIpcHandlers(): void {
  ipcMain.handle('vector:search', async (_, query: string) => {
    try {
      return await vectorStore.search(query);
    } catch (error) {
      logger.error('Error searching vectors:', error);
      throw error;
    }
  });

  ipcMain.handle('vector:add', async (_, doc: { id: string; content: string }) => {
    try {
      await vectorStore.add(doc);
    } catch (error) {
      logger.error('Error adding vector:', error);
      throw error;
    }
  });

  ipcMain.handle('vector:delete', async (_, id: string) => {
    try {
      await vectorStore.delete(id);
    } catch (error) {
      logger.error('Error deleting vector:', error);
      throw error;
    }
  });

  ipcMain.handle('vector:clear', async () => {
    try {
      await vectorStore.clear();
    } catch (error) {
      logger.error('Error clearing vectors:', error);
      throw error;
    }
  });

  ipcMain.handle('vector:stats', async () => {
    try {
      return await vectorStore.stats();
    } catch (error) {
      logger.error('Error getting vector stats:', error);
      throw error;
    }
  });
} 