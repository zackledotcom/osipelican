import { ipcMain } from 'electron';
import { CHANNELS, Memory } from './types';
import { MemoryService } from '../services/MemoryService';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export function registerMemoryHandlers(memoryService: MemoryService) {
  // Get recent memories handler
  ipcMain.handle(CHANNELS.MEMORY.GET_RECENT, async (_, limit: number = 10): Promise<Memory.GetRecentResponse> => {
    try {
      const memories = await memoryService.getRecent(limit);
      return {
        success: true,
        data: memories,
      };
    } catch (error) {
      logger.error('Failed to get recent memories:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  });

  // Store memory handler
  ipcMain.handle(CHANNELS.MEMORY.STORE, async (_, memory: Omit<Memory.MemoryChunk, 'id'>): Promise<Memory.StoreResponse> => {
    try {
      const memoryWithId = {
        ...memory,
        id: uuidv4(),
      };
      await memoryService.store(memoryWithId);
      return {
        success: true,
      };
    } catch (error) {
      logger.error('Failed to store memory:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  });

  // Delete memory handler
  ipcMain.handle(CHANNELS.MEMORY.DELETE, async (_, id: string): Promise<Memory.DeleteResponse> => {
    try {
      await memoryService.delete(id);
      return {
        success: true,
      };
    } catch (error) {
      logger.error('Failed to delete memory:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  });

  // Clear memories handler
  ipcMain.handle(CHANNELS.MEMORY.CLEAR, async (): Promise<Memory.ClearResponse> => {
    try {
      await memoryService.clear();
      return {
        success: true,
      };
    } catch (error) {
      logger.error('Failed to clear memories:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  });

  // Get stats handler
  ipcMain.handle(CHANNELS.MEMORY.GET_STATS, async (): Promise<Memory.StatsResponse> => {
    try {
      const stats = await memoryService.getStats();
      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      logger.error('Failed to get memory stats:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  });
} 