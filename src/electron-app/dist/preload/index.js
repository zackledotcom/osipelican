"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const channels_1 = require("../ipc/channels");
// Type-safe wrapper for IPC calls
const safeInvoke = async (channel, ...args) => {
    try {
        return await electron_1.ipcRenderer.invoke(channel, ...args);
    }
    catch (error) {
        console.error(`Error in IPC call to ${channel}:`, error);
        throw error;
    }
};
// Stream listener with proper cleanup
const createStreamListener = (channel, callback) => {
    const subscription = (_event, data) => callback(data);
    electron_1.ipcRenderer.on(channel, subscription);
    return () => {
        electron_1.ipcRenderer.removeListener(channel, subscription);
    };
};
// Expose a type-safe API to the renderer process
const electronAPI = {
    chat: {
        sendMessage: (message) => safeInvoke(channels_1.IPC_CHANNELS.CHAT.SEND_MESSAGE, message),
        sendMessageStream: (message) => safeInvoke(channels_1.IPC_CHANNELS.CHAT.SEND_MESSAGE_STREAM, message),
        createConversation: (title) => safeInvoke(channels_1.IPC_CHANNELS.CHAT.CREATE_CONVERSATION, title),
        getConversation: (id) => safeInvoke(channels_1.IPC_CHANNELS.CHAT.GET_CONVERSATION, id),
        listConversations: () => safeInvoke(channels_1.IPC_CHANNELS.CHAT.GET_CONVERSATIONS),
        deleteConversation: (id) => safeInvoke(channels_1.IPC_CHANNELS.CHAT.DELETE_CONVERSATION, id),
        updateConversationTitle: (id, title) => safeInvoke(channels_1.IPC_CHANNELS.CHAT.UPDATE_CONVERSATION_TITLE, id, title),
    },
    app: {
        healthCheck: () => safeInvoke(channels_1.IPC_CHANNELS.APP.HEALTH_CHECK),
    },
    ollama: {
        listModels: () => safeInvoke(channels_1.IPC_CHANNELS.OLLAMA.LIST_MODELS),
        setModel: (modelName) => safeInvoke(channels_1.IPC_CHANNELS.OLLAMA.SET_MODEL, modelName),
        checkConnection: () => safeInvoke(channels_1.IPC_CHANNELS.OLLAMA.CHECK_CONNECTION),
        cancelLoad: () => safeInvoke(channels_1.IPC_CHANNELS.OLLAMA.CANCEL_LOAD),
    },
    vectorStore: {
        search: (query) => safeInvoke(channels_1.IPC_CHANNELS.VECTOR.SEARCH, query),
        add: (document) => safeInvoke(channels_1.IPC_CHANNELS.VECTOR.ADD, document),
        delete: (id) => safeInvoke(channels_1.IPC_CHANNELS.VECTOR.DELETE, id),
        clear: () => safeInvoke(channels_1.IPC_CHANNELS.VECTOR.CLEAR),
    },
    // Development helpers
    __dev: {
        onMessageReceived: (callback) => createStreamListener(channels_1.IPC_CHANNELS.CHAT.MESSAGE_RECEIVED, callback),
        onModelLoadingStateChanged: (callback) => createStreamListener(channels_1.IPC_CHANNELS.OLLAMA.MODEL_LOADING_STATE_CHANGED, callback),
    },
};
// Expose the API to the renderer process
electron_1.contextBridge.exposeInMainWorld('electronAPI', electronAPI);
// Add development helpers
if (process.env.NODE_ENV === 'development') {
    electron_1.contextBridge.exposeInMainWorld('__electronDebug', {
        listChannels: () => Object.values(channels_1.IPC_CHANNELS).flatMap(obj => Object.values(obj)),
        ipcRenderer: {
            listenerCount: (channel) => electron_1.ipcRenderer.listenerCount(channel),
        },
    });
}
// Memory API
const memoryAPI = {
    initialize: () => electron_1.ipcRenderer.invoke('memory:initialize'),
    store: (content, metadata) => electron_1.ipcRenderer.invoke('memory:store', { content, metadata }),
    search: (query, options) => electron_1.ipcRenderer.invoke('memory:search', { query, options }),
    getRecent: (limit) => electron_1.ipcRenderer.invoke('memory:get-recent', { limit }),
    delete: (id) => electron_1.ipcRenderer.invoke('memory:delete', { id }),
    clear: () => electron_1.ipcRenderer.invoke('memory:clear'),
    // Event listeners
    onInitialized: (callback) => {
        electron_1.ipcRenderer.on('memory:initialized', callback);
        return () => electron_1.ipcRenderer.removeListener('memory:initialized', callback);
    },
    onStored: (callback) => {
        const handler = (_, memory) => callback(memory);
        electron_1.ipcRenderer.on('memory:stored', handler);
        return () => electron_1.ipcRenderer.removeListener('memory:stored', handler);
    },
    onSearched: (callback) => {
        const handler = (_, memories) => callback(memories);
        electron_1.ipcRenderer.on('memory:searched', handler);
        return () => electron_1.ipcRenderer.removeListener('memory:searched', handler);
    },
    onRecent: (callback) => {
        const handler = (_, memories) => callback(memories);
        electron_1.ipcRenderer.on('memory:recent', handler);
        return () => electron_1.ipcRenderer.removeListener('memory:recent', handler);
    },
    onDeleted: (callback) => {
        const handler = (_, id) => callback(id);
        electron_1.ipcRenderer.on('memory:deleted', handler);
        return () => electron_1.ipcRenderer.removeListener('memory:deleted', handler);
    },
    onCleared: (callback) => {
        electron_1.ipcRenderer.on('memory:cleared', callback);
        return () => electron_1.ipcRenderer.removeListener('memory:cleared', callback);
    }
};
// Expose APIs to renderer process
electron_1.contextBridge.exposeInMainWorld('memoryAPI', memoryAPI);
electron_1.contextBridge.exposeInMainWorld('electron', {
    ipc: {
        invoke: (channel, ...args) => {
            const validInvokeChannels = [
                channels_1.IPC_CHANNELS.CHAT.GET_CONVERSATIONS,
                channels_1.IPC_CHANNELS.CHAT.GET_CONVERSATION,
                channels_1.IPC_CHANNELS.CHAT.SEND_MESSAGE,
                channels_1.IPC_CHANNELS.CHAT.SEND_MESSAGE_STREAM,
                channels_1.IPC_CHANNELS.CHAT.CREATE_CONVERSATION,
                channels_1.IPC_CHANNELS.CHAT.DELETE_CONVERSATION,
                channels_1.IPC_CHANNELS.CHAT.UPDATE_CONVERSATION_TITLE,
                channels_1.IPC_CHANNELS.APP.HEALTH_CHECK,
                channels_1.IPC_CHANNELS.OLLAMA.LIST_MODELS,
                channels_1.IPC_CHANNELS.OLLAMA.SET_MODEL,
                channels_1.IPC_CHANNELS.OLLAMA.CHECK_CONNECTION,
                channels_1.IPC_CHANNELS.OLLAMA.CANCEL_LOAD,
                channels_1.IPC_CHANNELS.VECTOR.SEARCH,
                channels_1.IPC_CHANNELS.VECTOR.ADD,
                channels_1.IPC_CHANNELS.VECTOR.DELETE,
                channels_1.IPC_CHANNELS.VECTOR.CLEAR
            ];
            const validListenerChannels = [
                channels_1.IPC_CHANNELS.CHAT.MESSAGE_RECEIVED,
                channels_1.IPC_CHANNELS.OLLAMA.MODEL_LOADING_STATE_CHANGED
            ];
            if (validInvokeChannels.includes(channel)) {
                return electron_1.ipcRenderer.invoke(channel, ...args);
            }
            return Promise.reject(new Error(`Invalid channel: ${channel}`));
        },
        on: (channel, callback) => {
            const validListenerChannels = [
                channels_1.IPC_CHANNELS.CHAT.STREAM_CHUNK,
                channels_1.IPC_CHANNELS.CHAT.STREAM_END,
                channels_1.IPC_CHANNELS.CHAT.STREAM_ERROR,
                channels_1.IPC_CHANNELS.OLLAMA.MODEL_LOADING_STATE_CHANGED
            ];
            if (validListenerChannels.includes(channel)) {
                electron_1.ipcRenderer.on(channel, (_event, ...args) => callback(...args));
            }
        }
    }
});
