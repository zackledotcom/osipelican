export declare const IPC_CHANNELS: {
    readonly CHAT: {
        readonly SEND_MESSAGE: "chat:send-message";
        readonly SEND_MESSAGE_STREAM: "chat:send-message-stream";
        readonly STREAM_CHUNK: "chat:stream-chunk";
        readonly STREAM_END: "chat:stream-end";
        readonly STREAM_ERROR: "chat:stream-error";
        readonly GET_CONVERSATIONS: "chat:get-conversations";
        readonly GET_CONVERSATION: "chat:get-conversation";
        readonly CREATE_CONVERSATION: "chat:create-conversation";
        readonly UPDATE_CONVERSATION_TITLE: "chat:update-conversation-title";
        readonly MESSAGE_RECEIVED: "chat:message-received";
        readonly DELETE_CONVERSATION: "chat:delete-conversation";
    };
    readonly APP: {
        readonly HEALTH_CHECK: "app:health-check";
        readonly SERVICE_STATUS_CHANGED: "app:service-status-changed";
        readonly GET_THEME: "app:get-theme";
        readonly SET_THEME: "app:set-theme";
        readonly THEME_UPDATED: "app:theme-updated";
    };
    readonly OLLAMA: {
        readonly LIST_MODELS: "ollama:list-models";
        readonly SET_MODEL: "ollama:set-model";
        readonly CHECK_CONNECTION: "ollama:check-connection";
        readonly CANCEL_LOAD: "ollama:cancel-load";
        readonly MODEL_LOADING_STATE_CHANGED: "ollama:model-loading-state-changed";
        readonly SAVE_CONFIG: "ollama:save-config";
        readonly GET_CONNECTION_STATUS: "ollama:get-connection-status";
    };
    readonly MEMORY: {
        readonly INITIALIZE: "memory:initialize";
        readonly STORE: "memory:store";
        readonly SEARCH: "memory:search";
        readonly GET_RECENT: "memory:get-recent";
        readonly DELETE: "memory:delete";
        readonly CLEAR: "memory:clear";
    };
    readonly VECTOR: {
        readonly ADD_DOCUMENT: "vector:add-document";
        readonly SEARCH: "vector:search";
        readonly GET_DOCUMENTS: "vector:get-documents";
        readonly ADD: "vector:add";
        readonly DELETE: "vector:delete";
        readonly CLEAR: "vector:clear";
        readonly CHUNK: "vector:chunk";
        readonly MERGE: "vector:merge";
    };
    readonly EMBEDDING: {
        readonly GET_CONFIG: "embedding:get-config";
        readonly UPDATE_CONFIG: "embedding:update-config";
    };
};
export type IpcChannel = {
    [K in keyof typeof IPC_CHANNELS]: typeof IPC_CHANNELS[K][keyof typeof IPC_CHANNELS[K]];
}[keyof typeof IPC_CHANNELS];
