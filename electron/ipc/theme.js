"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupThemeHandlers = setupThemeHandlers;
const electron_1 = require("electron");
const logger_1 = require("./utils/logger");
const channels_1 = require("./channels");
/**
 * Sets up IPC handlers for theme-related operations
 */
function setupThemeHandlers() {
    // Get current theme
    electron_1.ipcMain.handle(channels_1.IPC_CHANNELS.APP.GET_THEME, () => {
        return electron_1.nativeTheme.themeSource;
    });
    // Set theme
    electron_1.ipcMain.handle(channels_1.IPC_CHANNELS.APP.SET_THEME, (_event, theme) => {
        try {
            logger_1.logger.info(`Setting theme to: ${theme}`);
            electron_1.nativeTheme.themeSource = theme;
            return true;
        }
        catch (error) {
            logger_1.logger.error('Error setting theme:', error);
            throw error;
        }
    });
    // Listen for native theme changes and notify renderer
    electron_1.nativeTheme.on('updated', () => {
        const windows = electron_1.BrowserWindow.getAllWindows();
        windows.forEach(window => {
            window.webContents.send(channels_1.IPC_CHANNELS.APP.THEME_UPDATED, {
                theme: electron_1.nativeTheme.themeSource,
                shouldUseDarkColors: electron_1.nativeTheme.shouldUseDarkColors
            });
        });
        logger_1.logger.info(`Native theme updated: ${electron_1.nativeTheme.themeSource}, shouldUseDarkColors: ${electron_1.nativeTheme.shouldUseDarkColors}`);
    });
}
