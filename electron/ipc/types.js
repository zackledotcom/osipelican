"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CHANNELS = exports.Chat = void 0;
const zod_1 = require("zod");
// Domain-specific request/response types
var Chat;
(function (Chat) {
    Chat.MessageSchema = zod_1.z.object({
        id: zod_1.z.string(),
        content: zod_1.z.string(),
        role: zod_1.z.enum(['user', 'assistant', 'system']),
        timestamp: zod_1.z.number(),
        metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
    });
    Chat.ConversationSchema = zod_1.z.object({
        id: zod_1.z.string(),
        title: zod_1.z.string(),
        messages: zod_1.z.array(Chat.MessageSchema),
        createdAt: zod_1.z.number(),
        updatedAt: zod_1.z.number(),
        metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
        topic: zod_1.z.string().optional(),
        tags: zod_1.z.array(zod_1.z.string()),
    });
})(Chat || (exports.Chat = Chat = {}));
// Channel names with type safety
exports.CHANNELS = {
    CHAT: {
        SEND_MESSAGE: 'chat:send-message',
        GET_CONVERSATIONS: 'chat:get-conversations',
        GET_CONVERSATION: 'chat:get-conversation',
        CREATE_CONVERSATION: 'chat:create-conversation',
        UPDATE_CONVERSATION_TITLE: 'chat:update-conversation-title',
    },
    OLLAMA: {
        LIST_MODELS: 'ollama:list-models',
        SET_MODEL: 'ollama:set-model',
        CHECK_CONNECTION: 'ollama:check-connection',
        SAVE_CONFIG: 'ollama:save-config',
    },
    MEMORY: {
        GET_RECENT: 'memory:get-recent',
        SEARCH: 'memory:search',
        STORE: 'memory:store',
        DELETE: 'memory:delete',
        CLEAR: 'memory:clear',
        GET_STATS: 'memory:get-stats',
    },
    SERVICE: {
        GET_STATUS: 'service:get-status',
        GET_ALL_STATUS: 'service:get-all-status',
        RESTART: 'service:restart',
        STOP: 'service:stop',
    },
    EVENTS: {
        SERVICE_STATUS_CHANGED: 'events:service-status-changed',
        MODEL_LOADING_STATE_CHANGED: 'events:model-loading-state-changed',
        MEMORY_STORED: 'events:memory-stored',
        MEMORY_DELETED: 'events:memory-deleted',
        MEMORY_CLEARED: 'events:memory-cleared',
    },
};
