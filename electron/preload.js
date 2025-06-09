// electron-app/src/preload.js

const { contextBridge, ipcRenderer } = require('electron');

const ipc_channels = {
  chat: {
    send_message: 'chat:send-message',
    send_message_stream: 'chat:send-message-stream',
    stream_chunk: 'chat:stream-chunk',
    stream_end: 'chat:stream-end',
    stream_error: 'chat:stream-error',
    get_conversations: 'chat:get-conversations',
    get_conversation: 'chat:get-conversation',
    create_conversation: 'chat:create-conversation',
    update_conversation_title: 'chat:update-conversation-title',
    message_received: 'chat:message-received',
    delete_conversation: 'chat:delete-conversation',
    assign_topic: 'chat:assign-topic',
  },
  app: {
    health_check: 'app:health-check',
    service_status_changed: 'app:service-status-changed',
    get_theme: 'app:get-theme',
    set_theme: 'app:set-theme',
    theme_updated: 'app:theme-updated',
    metrics_update: 'app:metrics-update',
  },
  ollama: {
    list_models: 'ollama:list-models',
    set_model: 'ollama:set-model',
    check_connection: 'ollama:check-connection',
    cancel_load: 'ollama:cancel-load',
    model_loading_state_changed: 'ollama:model-loading-state-changed',
    save_config: 'ollama:save-config',
    get_connection_status: 'ollama:get-connection-status',
  },
  memory: {
    initialize: 'memory:initialize',
    store: 'memory:store',
    search: 'memory:search',
    get_recent: 'memory:get-recent',
    delete: 'memory:delete',
    clear: 'memory:clear',
  },
  vector: {
    add_document: 'vector:add-document',
    search: 'vector:search',
    get_documents: 'vector:get-documents',
    add: 'vector:add',
    delete: 'vector:delete',
    clear: 'vector:clear',
    chunk: 'vector:chunk',
    merge: 'vector:merge',
    get_stats: 'vector:get-stats',
  },
  embedding: {
    get_config: 'embedding:get-config',
    update_config: 'embedding:update-config',
  },
};

const electron_api = {
  chat: {
    send_message: (msg) => ipcRenderer.invoke(ipc_channels.chat.send_message, msg),
    send_message_stream: (msg) => ipcRenderer.invoke(ipc_channels.chat.send_message_stream, msg),
    get_conversations: () => ipcRenderer.invoke(ipc_channels.chat.get_conversations),
    get_conversation: (id) => ipcRenderer.invoke(ipc_channels.chat.get_conversation, id),
    create_conversation: (title) => ipcRenderer.invoke(ipc_channels.chat.create_conversation, title),
    update_conversation_title: (id, title) => ipcRenderer.invoke(ipc_channels.chat.update_conversation_title, id, title),
    delete_conversation: (id) => ipcRenderer.invoke(ipc_channels.chat.delete_conversation, id),
    assign_topic: (data) => ipcRenderer.invoke(ipc_channels.chat.assign_topic, data),
    on_stream_chunk: (cb) => {
      ipcRenderer.on(ipc_channels.chat.stream_chunk, (_, chunk) => cb(chunk));
      return () => ipcRenderer.removeAllListeners(ipc_channels.chat.stream_chunk);
    },
    on_stream_end: (cb) => {
      ipcRenderer.on(ipc_channels.chat.stream_end, cb);
      return () => ipcRenderer.removeAllListeners(ipc_channels.chat.stream_end);
    },
    on_stream_error: (cb) => {
      ipcRenderer.on(ipc_channels.chat.stream_error, (_, err) => cb(err));
      return () => ipcRenderer.removeAllListeners(ipc_channels.chat.stream_error);
    },
    on_message_received: (cb) => {
      ipcRenderer.on(ipc_channels.chat.message_received, (_, msg) => cb(msg));
      return () => ipcRenderer.removeAllListeners(ipc_channels.chat.message_received);
    },
  },
  app: {
    health_check: () => ipcRenderer.invoke(ipc_channels.app.health_check),
    get_theme: () => ipcRenderer.invoke(ipc_channels.app.get_theme),
    set_theme: (theme) => ipcRenderer.invoke(ipc_channels.app.set_theme, theme),
    on_service_status_changed: (cb) => {
      ipcRenderer.on(ipc_channels.app.service_status_changed, (_, status) => cb(status));
      return () => ipcRenderer.removeAllListeners(ipc_channels.app.service_status_changed);
    },
    on_theme_updated: (cb) => {
      ipcRenderer.on(ipc_channels.app.theme_updated, (_, theme) => cb(theme));
      return () => ipcRenderer.removeAllListeners(ipc_channels.app.theme_updated);
    },
    on_metrics_update: (cb) => {
      ipcRenderer.on(ipc_channels.app.metrics_update, (_, data) => cb(data));
      return () => ipcRenderer.removeAllListeners(ipc_channels.app.metrics_update);
    },
  },
  ollama: {
    list_models: () => ipcRenderer.invoke(ipc_channels.ollama.list_models),
    set_model: (name) => ipcRenderer.invoke(ipc_channels.ollama.set_model, name),
    check_connection: () => ipcRenderer.invoke(ipc_channels.ollama.check_connection),
    cancel_load: () => ipcRenderer.invoke(ipc_channels.ollama.cancel_load),
    save_config: (cfg) => ipcRenderer.invoke(ipc_channels.ollama.save_config, cfg),
    get_connection_status: () => ipcRenderer.invoke(ipc_channels.ollama.get_connection_status),
    on_model_loading_state_changed: (cb) => {
      ipcRenderer.on(ipc_channels.ollama.model_loading_state_changed, (_, state) => cb(state));
      return () => ipcRenderer.removeAllListeners(ipc_channels.ollama.model_loading_state_changed);
    },
  },
  memory: {
    initialize: () => ipcRenderer.invoke(ipc_channels.memory.initialize),
    store: (chunk) => ipcRenderer.invoke(ipc_channels.memory.store, chunk),
    search: (query) => ipcRenderer.invoke(ipc_channels.memory.search, query),
    get_recent: (limit) => ipcRenderer.invoke(ipc_channels.memory.get_recent, limit),
    delete: (id) => ipcRenderer.invoke(ipc_channels.memory.delete, id),
    clear: () => ipcRenderer.invoke(ipc_channels.memory.clear),
  },
  vector: {
    add_document: (doc) => ipcRenderer.invoke(ipc_channels.vector.add_document, doc),
    search: (query) => ipcRenderer.invoke(ipc_channels.vector.search, query),
    get_documents: () => ipcRenderer.invoke(ipc_channels.vector.get_documents),
    add: (doc) => ipcRenderer.invoke(ipc_channels.vector.add, doc),
    delete: (id) => ipcRenderer.invoke(ipc_channels.vector.delete, id),
    clear: () => ipcRenderer.invoke(ipc_channels.vector.clear),
    chunk: (data) => ipcRenderer.invoke(ipc_channels.vector.chunk, data),
    merge: (data) => ipcRenderer.invoke(ipc_channels.vector.merge, data),
    get_stats: () => ipcRenderer.invoke(ipc_channels.vector.get_stats),
  },
  embedding: {
    get_config: () => ipcRenderer.invoke(ipc_channels.embedding.get_config),
    update_config: (cfg) => ipcRenderer.invoke(ipc_channels.embedding.update_config, cfg),
  },
};

contextBridge.exposeInMainWorld('electron_api', electron_api);