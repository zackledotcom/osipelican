const { contextBridge, ipcRenderer } = require('electron');

// IPC Channels
const IPC_CHANNELS = {
  CHAT: {
    SEND_MESSAGE: 'chat:send-message',
    SEND_MESSAGE_STREAM: 'chat:send-message-stream',
    STREAM_CHUNK: 'chat:stream-chunk',
    STREAM_END: 'chat:stream-end',
    STREAM_ERROR: 'chat:stream-error',
    GET_CONVERSATIONS: 'chat:get-conversations',
    GET_CONVERSATION: 'chat:get-conversation',
    CREATE_CONVERSATION: 'chat:create-conversation',
    UPDATE_CONVERSATION_TITLE: 'chat:update-conversation-title',
    MESSAGE_RECEIVED: 'chat:message-received',
    DELETE_CONVERSATION: 'chat:delete-conversation',
    ASSIGN_TOPIC: 'chat:assign-topic',
  },
  APP: {
    HEALTH_CHECK: 'app:health-check',
    SERVICE_STATUS_CHANGED: 'app:service-status-changed',
    GET_THEME: 'app:get-theme',
    SET_THEME: 'app:set-theme',
    THEME_UPDATED: 'app:theme-updated',
    METRICS_UPDATE: 'app:metrics-update'
  },
  OLLAMA: {
    LIST_MODELS: 'ollama:list-models',
    SET_MODEL: 'ollama:set-model',
    CHECK_CONNECTION: 'ollama:check-connection',
    CANCEL_LOAD: 'ollama:cancel-load',
    MODEL_LOADING_STATE_CHANGED: 'ollama:model-loading-state-changed',
    SAVE_CONFIG: 'ollama:save-config',
    GET_CONNECTION_STATUS: 'ollama:get-connection-status'
  },
  MEMORY: {
    INITIALIZE: 'memory:initialize',
    STORE: 'memory:store',
    SEARCH: 'memory:search',
    GET_RECENT: 'memory:get-recent',
    DELETE: 'memory:delete',
    CLEAR: 'memory:clear'
  },
  VECTOR: {
    ADD_DOCUMENT: 'vector:add-document',
    SEARCH: 'vector:search',
    GET_DOCUMENTS: 'vector:get-documents',
    ADD: 'vector:add',
    DELETE: 'vector:delete',
    CLEAR: 'vector:clear',
    CHUNK: 'vector:chunk',
    MERGE: 'vector:merge',
    GET_STATS: 'vector:get-stats'
  },
  EMBEDDING: {
    GET_CONFIG: 'embedding:get-config',
    UPDATE_CONFIG: 'embedding:update-config',
  },
};

const electronAPI = {
  // Chat API
  chat: {
    sendMessage: (message) => ipcRenderer.invoke(IPC_CHANNELS.CHAT.SEND_MESSAGE, message),
    sendMessageStream: (message) => ipcRenderer.invoke(IPC_CHANNELS.CHAT.SEND_MESSAGE_STREAM, message),
    getConversations: () => ipcRenderer.invoke(IPC_CHANNELS.CHAT.GET_CONVERSATIONS),
    getConversation: (id) => ipcRenderer.invoke(IPC_CHANNELS.CHAT.GET_CONVERSATION, id),
    createConversation: (title) => ipcRenderer.invoke(IPC_CHANNELS.CHAT.CREATE_CONVERSATION, title),
    updateConversationTitle: (id, title) => ipcRenderer.invoke(IPC_CHANNELS.CHAT.UPDATE_CONVERSATION_TITLE, id, title),
    deleteConversation: (id) => ipcRenderer.invoke(IPC_CHANNELS.CHAT.DELETE_CONVERSATION, id),
    onStreamChunk: (callback) => {
      ipcRenderer.on(IPC_CHANNELS.CHAT.STREAM_CHUNK, (_, chunk) => callback(chunk));
      return () => ipcRenderer.removeAllListeners(IPC_CHANNELS.CHAT.STREAM_CHUNK);
    },
    onStreamEnd: (callback) => {
      ipcRenderer.on(IPC_CHANNELS.CHAT.STREAM_END, callback);
      return () => ipcRenderer.removeAllListeners(IPC_CHANNELS.CHAT.STREAM_END);
    },
    onStreamError: (callback) => {
      ipcRenderer.on(IPC_CHANNELS.CHAT.STREAM_ERROR, (_, error) => callback(error));
      return () => ipcRenderer.removeAllListeners(IPC_CHANNELS.CHAT.STREAM_ERROR);
    },
    onMessageReceived: (callback) => {
      ipcRenderer.on(IPC_CHANNELS.CHAT.MESSAGE_RECEIVED, (_, message) => callback(message));
      return () => ipcRenderer.removeAllListeners(IPC_CHANNELS.CHAT.MESSAGE_RECEIVED);
    },
    assignTopic: (data) => ipcRenderer.invoke(IPC_CHANNELS.CHAT.ASSIGN_TOPIC, data),
  },
  // App API
  app: {
    healthCheck: () => ipcRenderer.invoke(IPC_CHANNELS.APP.HEALTH_CHECK),
    getTheme: () => ipcRenderer.invoke(IPC_CHANNELS.APP.GET_THEME),
    setTheme: (theme) => ipcRenderer.invoke(IPC_CHANNELS.APP.SET_THEME, theme),
    onServiceStatusChanged: (callback) => {
      ipcRenderer.on(IPC_CHANNELS.APP.SERVICE_STATUS_CHANGED, (_, status) => callback(status));
      return () => ipcRenderer.removeAllListeners(IPC_CHANNELS.APP.SERVICE_STATUS_CHANGED);
    },
    onThemeUpdated: (callback) => {
      ipcRenderer.on(IPC_CHANNELS.APP.THEME_UPDATED, (_, theme) => callback(theme));
      return () => ipcRenderer.removeAllListeners(IPC_CHANNELS.APP.THEME_UPDATED);
    },
    onMetricsUpdate: (callback) => {
      ipcRenderer.on(IPC_CHANNELS.APP.METRICS_UPDATE, (_, metrics) => callback(metrics));
      return () => ipcRenderer.removeAllListeners(IPC_CHANNELS.APP.METRICS_UPDATE);
    }
  },
  // Ollama API
  ollama: {
    listModels: () => ipcRenderer.invoke(IPC_CHANNELS.OLLAMA.LIST_MODELS),
    setModel: (modelName) => ipcRenderer.invoke(IPC_CHANNELS.OLLAMA.SET_MODEL, modelName),
    checkConnection: () => ipcRenderer.invoke(IPC_CHANNELS.OLLAMA.CHECK_CONNECTION),
    cancelLoad: () => ipcRenderer.invoke(IPC_CHANNELS.OLLAMA.CANCEL_LOAD),
    saveConfig: (config) => ipcRenderer.invoke(IPC_CHANNELS.OLLAMA.SAVE_CONFIG, config),
    getConnectionStatus: () => ipcRenderer.invoke(IPC_CHANNELS.OLLAMA.GET_CONNECTION_STATUS),
    onModelLoadingStateChanged: (callback) => {
      ipcRenderer.on(IPC_CHANNELS.OLLAMA.MODEL_LOADING_STATE_CHANGED, (_, state) => callback(state));
      return () => ipcRenderer.removeAllListeners(IPC_CHANNELS.OLLAMA.MODEL_LOADING_STATE_CHANGED);
    }
  },
  // Memory API
  memory: {
    initialize: () => ipcRenderer.invoke(IPC_CHANNELS.MEMORY.INITIALIZE),
    store: (chunk) => ipcRenderer.invoke(IPC_CHANNELS.MEMORY.STORE, chunk),
    search: (query) => ipcRenderer.invoke(IPC_CHANNELS.MEMORY.SEARCH, query),
    getRecent: (limit) => ipcRenderer.invoke(IPC_CHANNELS.MEMORY.GET_RECENT, limit),
    delete: (id) => ipcRenderer.invoke(IPC_CHANNELS.MEMORY.DELETE, id),
    clear: () => ipcRenderer.invoke(IPC_CHANNELS.MEMORY.CLEAR),
  },
  // Vector Store API
  vector: {
    addDocument: (doc) => ipcRenderer.invoke(IPC_CHANNELS.VECTOR.ADD_DOCUMENT, doc),
    search: (query) => ipcRenderer.invoke(IPC_CHANNELS.VECTOR.SEARCH, query),
    getDocuments: () => ipcRenderer.invoke(IPC_CHANNELS.VECTOR.GET_DOCUMENTS),
    add: (doc) => ipcRenderer.invoke(IPC_CHANNELS.VECTOR.ADD, doc),
    delete: (id) => ipcRenderer.invoke(IPC_CHANNELS.VECTOR.DELETE, id),
    clear: () => ipcRenderer.invoke(IPC_CHANNELS.VECTOR.CLEAR),
    chunk: (data) => ipcRenderer.invoke(IPC_CHANNELS.VECTOR.CHUNK, data),
    merge: (data) => ipcRenderer.invoke(IPC_CHANNELS.VECTOR.MERGE, data),
    getStats: () => ipcRenderer.invoke(IPC_CHANNELS.VECTOR.GET_STATS),
  },
  // Embedding API
  embedding: {
    getConfig: () => ipcRenderer.invoke(IPC_CHANNELS.EMBEDDING.GET_CONFIG),
    updateConfig: (config) => ipcRenderer.invoke(IPC_CHANNELS.EMBEDDING.UPDATE_CONFIG, config),
  }
};

// Expose the API to the renderer
contextBridge.exposeInMainWorld('electronAPI', electronAPI);