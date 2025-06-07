import { ipcMain } from 'electron';
import { logger } from '../utils/logger';
import { OllamaClient } from '@shared/src/api/OllamaClient';

const client = OllamaClient.getInstance();

ipcMain.handle('app:health-check', async () => {
  try {
    const status = await client.checkConnection();
    return {
      status: status.status === 'connected' ? 'healthy' : 'unhealthy',
      timestamp: Date.now(),
      details: {
        ollamaConnected: status.status === 'connected',
        currentModel: client.getCurrentModel()
      }
    };
  } catch (error) {
    logger.error('Health check failed:', error);
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

ipcMain.handle('app:retry-service', async (_, { serviceName }) => {
  try {
    // Implement service retry logic here
    return true;
  } catch (error) {
    logger.error(`Failed to retry service ${serviceName}:`, error);
    return false;
  }
});

ipcMain.handle('app:show-setup-guide', () => {
  // Implement setup guide display logic
});

ipcMain.handle('app:show-troubleshooter', () => {
  // Implement troubleshooter display logic
}); 