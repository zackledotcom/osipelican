import { ipcMain } from 'electron';
import { CHANNELS, Ollama } from './types';
import { OllamaService } from '../services/OllamaService';
import { logger } from '../utils/logger';
import type { OllamaConnectionStatus } from '../types/ollama';

export function registerOllamaHandlers(ollamaService: OllamaService) {
  // List models handler
  ipcMain.handle(CHANNELS.OLLAMA.LIST_MODELS, async (): Promise<Ollama.ListModelsResponse> => {
    try {
      const { models } = await ollamaService.listModels();
      return {
        success: true,
        data: { models },
      };
    } catch (error) {
      logger.error('Failed to list models:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  });

  // Set model handler
  ipcMain.handle(CHANNELS.OLLAMA.SET_MODEL, async (_, modelName: string): Promise<Ollama.SetModelResponse> => {
    try {
      await ollamaService.setModel(modelName);
      return {
        success: true,
      };
    } catch (error) {
      logger.error('Failed to set model:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  });

  // Check connection handler
  ipcMain.handle(CHANNELS.OLLAMA.CHECK_CONNECTION, async (): Promise<Ollama.CheckConnectionResponse> => {
    try {
      const status = await ollamaService.getStatus();
      const connectionStatus: OllamaConnectionStatus = {
        connected: status === 'running',
        error: status === 'error' ? 'Service error' : undefined,
      };
      return {
        success: true,
        data: connectionStatus,
      };
    } catch (error) {
      logger.error('Failed to check connection:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  });

  // Save config handler
  ipcMain.handle(CHANNELS.OLLAMA.SAVE_CONFIG, async (_, config: Record<string, unknown>): Promise<Ollama.SaveConfigResponse> => {
    try {
      if ('model' in config && typeof config.model === 'string') {
        await ollamaService.setModel(config.model);
      }
      return {
        success: true,
      };
    } catch (error) {
      logger.error('Failed to save config:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  });
} 