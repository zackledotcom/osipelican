import { z } from 'zod';
import type { OllamaModel, OllamaConnectionStatus, ModelLoadingState } from '../types/ollama';
import type { ServiceStatus } from '../config/services';
export interface IpcResponse<T = void> {
    success: boolean;
    error?: string;
    data?: T;
}
export declare namespace Chat {
    const MessageSchema: any;
    const ConversationSchema: any;
    type Message = z.infer<typeof MessageSchema>;
    type Conversation = z.infer<typeof ConversationSchema>;
    interface SendMessageRequest {
        content: string;
        conversationId?: string;
        metadata?: Record<string, unknown>;
    }
    interface SendMessageResponse extends IpcResponse<Message> {
    }
    interface GetConversationsResponse extends IpcResponse<Conversation[]> {
    }
    interface GetConversationResponse extends IpcResponse<Conversation> {
    }
    interface CreateConversationResponse extends IpcResponse<Conversation> {
    }
    interface UpdateConversationTitleResponse extends IpcResponse<void> {
    }
}
export declare namespace Ollama {
    interface ListModelsResponse extends IpcResponse<{
        models: OllamaModel[];
    }> {
    }
    interface SetModelResponse extends IpcResponse<void> {
    }
    interface CheckConnectionResponse extends IpcResponse<OllamaConnectionStatus> {
    }
    interface SaveConfigResponse extends IpcResponse<void> {
    }
}
export declare namespace Memory {
    interface MemoryChunk {
        id: string;
        content: string;
        metadata: {
            timestamp: number;
            source?: string;
            type?: string;
            tags?: string[];
            importance?: number;
            context?: Record<string, unknown>;
        };
        vector?: number[];
        similarity?: number;
        importance?: number;
        expiresAt?: number;
    }
    interface GetRecentResponse extends IpcResponse<MemoryChunk[]> {
    }
    interface SearchResponse extends IpcResponse<MemoryChunk[]> {
    }
    interface StoreResponse extends IpcResponse<void> {
    }
    interface DeleteResponse extends IpcResponse<void> {
    }
    interface ClearResponse extends IpcResponse<void> {
    }
    interface StatsResponse extends IpcResponse<{
        total: number;
        active: number;
        expired: number;
        averageImportance: number;
        cacheSize: number;
    }> {
    }
}
export declare namespace Service {
    interface GetStatusResponse extends IpcResponse<ServiceStatus> {
    }
    interface GetAllStatusResponse extends IpcResponse<Record<string, ServiceStatus>> {
    }
    interface RestartResponse extends IpcResponse<void> {
    }
    interface StopResponse extends IpcResponse<void> {
    }
}
export declare namespace Events {
    interface ServiceStatusChanged {
        serviceName: string;
        status: ServiceStatus;
        error?: string;
        details?: Record<string, unknown>;
    }
    interface ModelLoadingStateChanged {
        state: ModelLoadingState;
        progress?: number;
        error?: string;
    }
    interface MemoryStored {
        memory: Memory.MemoryChunk;
    }
    interface MemoryDeleted {
        id: string;
    }
    interface MemoryCleared {
    }
}
export declare const CHANNELS: {
    readonly CHAT: {
        readonly SEND_MESSAGE: "chat:send-message";
        readonly GET_CONVERSATIONS: "chat:get-conversations";
        readonly GET_CONVERSATION: "chat:get-conversation";
        readonly CREATE_CONVERSATION: "chat:create-conversation";
        readonly UPDATE_CONVERSATION_TITLE: "chat:update-conversation-title";
    };
    readonly OLLAMA: {
        readonly LIST_MODELS: "ollama:list-models";
        readonly SET_MODEL: "ollama:set-model";
        readonly CHECK_CONNECTION: "ollama:check-connection";
        readonly SAVE_CONFIG: "ollama:save-config";
    };
    readonly MEMORY: {
        readonly GET_RECENT: "memory:get-recent";
        readonly SEARCH: "memory:search";
        readonly STORE: "memory:store";
        readonly DELETE: "memory:delete";
        readonly CLEAR: "memory:clear";
        readonly GET_STATS: "memory:get-stats";
    };
    readonly SERVICE: {
        readonly GET_STATUS: "service:get-status";
        readonly GET_ALL_STATUS: "service:get-all-status";
        readonly RESTART: "service:restart";
        readonly STOP: "service:stop";
    };
    readonly EVENTS: {
        readonly SERVICE_STATUS_CHANGED: "events:service-status-changed";
        readonly MODEL_LOADING_STATE_CHANGED: "events:model-loading-state-changed";
        readonly MEMORY_STORED: "events:memory-stored";
        readonly MEMORY_DELETED: "events:memory-deleted";
        readonly MEMORY_CLEARED: "events:memory-cleared";
    };
};
export type ChannelMap = {
    [K in typeof CHANNELS[keyof typeof CHANNELS][keyof typeof CHANNELS[keyof typeof CHANNELS]]]: {
        request: unknown;
        response: IpcResponse<unknown>;
    };
};
