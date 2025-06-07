import { ipcMain } from 'electron';
import { OllamaClient } from '@shared/src/api/OllamaClient';
import { logger } from '../utils/logger';

const client = OllamaClient.getInstance();

ipcMain.handle('model:list', async () => {
  try {
    return await client.listModels();
  } catch (error) {
    logger.error('Error listing models:', error);
    throw error;
  }
});

ipcMain.handle('model:set', async (_, name: string) => {
  try {
    await client.setModel(name);
    return true;
  } catch (error) {
    logger.error('Error setting model:', error);
    throw error;
  }
});

ipcMain.handle('model:get', () => {
  return client.getCurrentModel();
}); 