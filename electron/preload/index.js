"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const channels_1 = require("/electron/ipc/channels.js");
const electronAPI = {
    // Chat API
    chat: {
        sendMessage: (message) => electron_1.ipcRenderer.invoke(channels_1.IPC_CHANNELS.CHAT.SEND_MESSAGE, message),
        sendMessageStream: (message) => electron_1.ipcRenderer.invoke(channels_1.IPC_CHANNELS.CHAT.SEND_MESSAGE_STREAM, message),
        getConversations: () => electron_1.ipcRenderer.invoke(channels_1.IPC_CHANNELS.CHAT.GET_CONVERSATIONS),
        getConversation: (id) => electron_1.ipcRenderer.invoke(channels_1.IPC_CHANNELS.CHAT.GET_CONVERSATION, id),
        createConversation: (title) => electron_1.ipcRenderer.invoke(channels_1.IPC_CHANNELS.CHAT.CREATE_CONVERSATION, title),
        updateConversationTitle: (id, title) => electron_1.ipcRenderer.invoke(channels_1.IPC_CHANNELS.CHAT.UPDATE_CONVERSATION_TITLE, id, title),
        deleteConversation: (id) => electron_1.ipcRenderer.invoke(channels_1.IPC_CHANNELS.CHAT.DELETE_CONVERSATION, id),
        onStreamChunk: (callback) => {
            electron_1.ipcRenderer.on(channels_1.IPC_CHANNELS.CHAT.STREAM_CHUNK, (_, chunk) => callback(chunk));
            return () => electron_1.ipcRenderer.removeAllListeners(channels_1.IPC_CHANNELS.CHAT.STREAM_CHUNK);
        },
        onStreamEnd: (callback) => {
            electron_1.ipcRenderer.on(channels_1.IPC_CHANNELS.CHAT.STREAM_END, callback);
            return () => electron_1.ipcRenderer.removeAllListeners(channels_1.IPC_CHANNELS.CHAT.STREAM_END);
        },
        onStreamError: (callback) => {
            electron_1.ipcRenderer.on(channels_1.IPC_CHANNELS.CHAT.STREAM_ERROR, (_, error) => callback(error));
            return () => electron_1.ipcRenderer.removeAllListeners(channels_1.IPC_CHANNELS.CHAT.STREAM_ERROR);
        },
        onMessageReceived: (callback) => {
            electron_1.ipcRenderer.on(channels_1.IPC_CHANNELS.CHAT.MESSAGE_RECEIVED, (_, message) => callback(message));
            return () => electron_1.ipcRenderer.removeAllListeners(channels_1.IPC_CHANNELS.CHAT.MESSAGE_RECEIVED);
        },
        assignTopic: (data) => electron_1.ipcRenderer.invoke(channels_1.IPC_CHANNELS.CHAT.ASSIGN_TOPIC, data),
    },
    // App API
    app: {
        healthCheck: () => electron_1.ipcRenderer.invoke(channels_1.IPC_CHANNELS.APP.HEALTH_CHECK),
        getTheme: () => electron_1.ipcRenderer.invoke(channels_1.IPC_CHANNELS.APP.GET_THEME),
        setTheme: (theme) => electron_1.ipcRenderer.invoke(channels_1.IPC_CHANNELS.APP.SET_THEME, theme),
        onServiceStatusChanged: (callback) => {
            electron_1.ipcRenderer.on(channels_1.IPC_CHANNELS.APP.SERVICE_STATUS_CHANGED, (_, status) => callback(status));
            return () => electron_1.ipcRenderer.removeAllListeners(channels_1.IPC_CHANNELS.APP.SERVICE_STATUS_CHANGED);
        },
        onThemeUpdated: (callback) => {
            electron_1.ipcRenderer.on(channels_1.IPC_CHANNELS.APP.THEME_UPDATED, (_, theme) => callback(theme));
            return () => electron_1.ipcRenderer.removeAllListeners(channels_1.IPC_CHANNELS.APP.THEME_UPDATED);
        },
        onMetricsUpdate: (callback) => {
            electron_1.ipcRenderer.on(channels_1.IPC_CHANNELS.APP.METRICS_UPDATE, (_, metrics) => callback(metrics));
            return () => electron_1.ipcRenderer.removeAllListeners(channels_1.IPC_CHANNELS.APP.METRICS_UPDATE);
        }
    },
    // Ollama API
    ollama: {
        listModels: () => electron_1.ipcRenderer.invoke(channels_1.IPC_CHANNELS.OLLAMA.LIST_MODELS),
        setModel: (modelName) => electron_1.ipcRenderer.invoke(channels_1.IPC_CHANNELS.OLLAMA.SET_MODEL, modelName),
        checkConnection: () => electron_1.ipcRenderer.invoke(channels_1.IPC_CHANNELS.OLLAMA.CHECK_CONNECTION),
        cancelLoad: () => electron_1.ipcRenderer.invoke(channels_1.IPC_CHANNELS.OLLAMA.CANCEL_LOAD),
        saveConfig: (config) => electron_1.ipcRenderer.invoke(channels_1.IPC_CHANNELS.OLLAMA.SAVE_CONFIG, config),
        getConnectionStatus: () => electron_1.ipcRenderer.invoke(channels_1.IPC_CHANNELS.OLLAMA.GET_CONNECTION_STATUS),
        onModelLoadingStateChanged: (callback) => {
            electron_1.ipcRenderer.on(channels_1.IPC_CHANNELS.OLLAMA.MODEL_LOADING_STATE_CHANGED, (_, state) => callback(state));
            return () => electron_1.ipcRenderer.removeAllListeners(channels_1.IPC_CHANNELS.OLLAMA.MODEL_LOADING_STATE_CHANGED);
        }
    },
    // Memory API
    memory: {
        initialize: () => electron_1.ipcRenderer.invoke(channels_1.IPC_CHANNELS.MEMORY.INITIALIZE),
        store: (chunk) => electron_1.ipcRenderer.invoke(channels_1.IPC_CHANNELS.MEMORY.STORE, chunk),
        search: (query) => electron_1.ipcRenderer.invoke(channels_1.IPC_CHANNELS.MEMORY.SEARCH, query),
        getRecent: (limit) => electron_1.ipcRenderer.invoke(channels_1.IPC_CHANNELS.MEMORY.GET_RECENT, limit),
        delete: (id) => electron_1.ipcRenderer.invoke(channels_1.IPC_CHANNELS.MEMORY.DELETE, id),
        clear: () => electron_1.ipcRenderer.invoke(channels_1.IPC_CHANNELS.MEMORY.CLEAR),
    },
    // Vector Store API
    vector: {
        addDocument: (doc) => electron_1.ipcRenderer.invoke(channels_1.IPC_CHANNELS.VECTOR.ADD_DOCUMENT, doc),
        search: (query) => electron_1.ipcRenderer.invoke(channels_1.IPC_CHANNELS.VECTOR.SEARCH, query),
        getDocuments: () => electron_1.ipcRenderer.invoke(channels_1.IPC_CHANNELS.VECTOR.GET_DOCUMENTS),
        add: (doc) => electron_1.ipcRenderer.invoke(channels_1.IPC_CHANNELS.VECTOR.ADD, doc),
        delete: (id) => electron_1.ipcRenderer.invoke(channels_1.IPC_CHANNELS.VECTOR.DELETE, id),
        clear: () => electron_1.ipcRenderer.invoke(channels_1.IPC_CHANNELS.VECTOR.CLEAR),
        chunk: (data) => electron_1.ipcRenderer.invoke(channels_1.IPC_CHANNELS.VECTOR.CHUNK, data),
        merge: (data) => electron_1.ipcRenderer.invoke(channels_1.IPC_CHANNELS.VECTOR.MERGE, data),
        getStats: () => electron_1.ipcRenderer.invoke(channels_1.IPC_CHANNELS.VECTOR.GET_STATS),
    },
    // Embedding API
    embedding: {
        getConfig: () => electron_1.ipcRenderer.invoke(channels_1.IPC_CHANNELS.EMBEDDING.GET_CONFIG),
        updateConfig: (config) => electron_1.ipcRenderer.invoke(channels_1.IPC_CHANNELS.EMBEDDING.UPDATE_CONFIG, config),
    }
};
// Expose the API to the renderer
electron_1.contextBridge.exposeInMainWorld('electronAPI', electronAPI);
