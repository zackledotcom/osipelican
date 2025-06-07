import { ipcMain, nativeTheme, BrowserWindow } from 'electron';
import { logger } from '../utils/logger';
import { IPC_CHANNELS } from './channels';

/**
 * Sets up IPC handlers for theme-related operations
 */
export function setupThemeHandlers(): void {
  // Get current theme
  ipcMain.handle(IPC_CHANNELS.APP.GET_THEME, () => {
    return nativeTheme.themeSource;
  });

  // Set theme
  ipcMain.handle(IPC_CHANNELS.APP.SET_THEME, (_event, theme: 'light' | 'dark' | 'system') => {
    try {
      logger.info(`Setting theme to: ${theme}`);
      nativeTheme.themeSource = theme;
      return true;
    } catch (error) {
      logger.error('Error setting theme:', error);
      throw error;
    }
  });

  // Listen for native theme changes and notify renderer
  nativeTheme.on('updated', () => {
    const windows = BrowserWindow.getAllWindows();
    windows.forEach(window => {
      window.webContents.send(IPC_CHANNELS.APP.THEME_UPDATED, {
        theme: nativeTheme.themeSource,
        shouldUseDarkColors: nativeTheme.shouldUseDarkColors
      });
    });
    logger.info(`Native theme updated: ${nativeTheme.themeSource}, shouldUseDarkColors: ${nativeTheme.shouldUseDarkColors}`);
  });
}
