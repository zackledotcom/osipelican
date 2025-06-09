"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const ollama = require('ollama');
// Minimal, modern IPC handlers using the real ollama npm module
// Chat message handler (simple example)
electron_1.ipcMain.handle('chat:send', async (_event, prompt) => {
    return await ollama.generate({ prompt });
});
// List available models
electron_1.ipcMain.handle('ollama:listModels', async () => {
    return await ollama.listModels();
});
// Set current model
electron_1.ipcMain.handle('ollama:setModel', async (_event, modelName) => {
    return await ollama.setModel(modelName);
});
// Check ollama connection
electron_1.ipcMain.handle('ollama:checkConnection', async () => {
    return await ollama.checkConnection();
});
// Add more handlers as needed, using ollama or other real modules directly 
