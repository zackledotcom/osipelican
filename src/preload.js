"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
console.log('[PRELOAD] Preload script started');
// Validate channel names for security
const VALID_CHANNELS = [
    'service:getStatus',
    'service:getAllStatus',
    'service:restart',
    'service:stop',
    'service:statusChanged',
    'window:minimize',
    'window:maximize',
    'window:close',
    'window:isMaximized',
    'theme:get',
    'theme:set',
    'app:get-theme',
    'app:set-theme',
    'app:theme-updated',
];
// Helper function to validate channel names
function isValidChannel(channel) {
    return VALID_CHANNELS.includes(channel);
}
// Helper function for safe IPC calls
async function safeInvoke(channel, ...args) {
    if (!isValidChannel(channel)) {
        throw new Error(`Invalid IPC channel: ${channel}`);
    }
    return electron_1.ipcRenderer.invoke(channel, ...args);
}
// Helper function for safe event listener registration
function safeOn(channel, callback) {
    if (!isValidChannel(channel)) {
        throw new Error(`Invalid IPC channel: ${channel}`);
    }
    electron_1.ipcRenderer.on(channel, (_event, ...args) => callback(...args));
    return () => {
        electron_1.ipcRenderer.removeListener(channel, callback);
    };
}
// Expose protected methods to the renderer process
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    // Service management
    getServiceStatus: (service) => safeInvoke('service:getStatus', service),
    getAllServiceStatus: () => safeInvoke('service:getAllStatus'),
    restartService: (service) => safeInvoke('service:restart', service),
    stopService: (service) => safeInvoke('service:stop', service),
    // Event handling
    onServiceStatusChange: (callback) => safeOn('service:statusChanged', callback),
    // Window management
    minimize: () => safeInvoke('window:minimize'),
    maximize: () => safeInvoke('window:maximize'),
    close: () => safeInvoke('window:close'),
    isMaximized: () => safeInvoke('window:isMaximized'),
    // Theme management
    getTheme: () => safeInvoke('app:get-theme'),
    setTheme: (theme) => safeInvoke('app:set-theme', theme),
    onThemeUpdated: (callback) => safeOn('app:theme-updated', callback),
});
// Log successful preload
console.log('Preload script executed successfully');
//# sourceMappingURL=preload.js.map