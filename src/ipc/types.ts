import { z } from 'zod';
import type { 
  OllamaModel, 
  OllamaConnectionStatus,
  ModelLoadingState,
  OllamaRequestOptions,
  OllamaResponse
} from '../types/ollama';
import type { ServiceStatus } from '../config/services';

// Base response type for all IPC calls
export interface IpcResponse<T = void> {
  success: boolean;
  error?: string;
  data?: T;
}

// Domain-specific request/response types
export namespace Chat {
  export const MessageSchema = z.object({
    id: z.string(),
    content: z.string(),
    role: z.enum(['user', 'assistant', 'system']),
    timestamp: z.number(),
    metadata: z.record(z.unknown()).optional(),
  });

  export const ConversationSchema = z.object({
    id: z.string(),
    title: z.string(),
    messages: z.array(MessageSchema),
    createdAt: z.number(),
    updatedAt: z.number(),
    metadata: z.record(z.unknown()).optional(),
  });

  export type Message = z.infer<typeof MessageSchema>;
  export type Conversation = z.infer<typeof ConversationSchema>;

  export interface SendMessageRequest {
    content: string;
    conversationId?: string;
    metadata?: Record<string, unknown>;
  }

  export interface SendMessageResponse extends IpcResponse<Message> {}
  export interface GetConversationsResponse extends IpcResponse<Conversation[]> {}
  export interface GetConversationResponse extends IpcResponse<Conversation> {}
  export interface CreateConversationResponse extends IpcResponse<Conversation> {}
  export interface UpdateConversationTitleResponse extends IpcResponse<void> {}
}

export namespace Ollama {
  export interface ListModelsResponse extends IpcResponse<{ models: OllamaModel[] }> {}
  export interface SetModelResponse extends IpcResponse<void> {}
  export interface CheckConnectionResponse extends IpcResponse<OllamaConnectionStatus> {}
  export interface SaveConfigResponse extends IpcResponse<void> {}
}

export namespace Memory {
  export interface MemoryChunk {
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

  export interface GetRecentResponse extends IpcResponse<MemoryChunk[]> {}
  export interface SearchResponse extends IpcResponse<MemoryChunk[]> {}
  export interface StoreResponse extends IpcResponse<void> {}
  export interface DeleteResponse extends IpcResponse<void> {}
  export interface ClearResponse extends IpcResponse<void> {}
  export interface StatsResponse extends IpcResponse<{
    total: number;
    active: number;
    expired: number;
    averageImportance: number;
    cacheSize: number;
  }> {}
}

export namespace Service {
  export interface GetStatusResponse extends IpcResponse<ServiceStatus> {}
  export interface GetAllStatusResponse extends IpcResponse<Record<string, ServiceStatus>> {}
  export interface RestartResponse extends IpcResponse<void> {}
  export interface StopResponse extends IpcResponse<void> {}
}

// Event types for real-time updates
export namespace Events {
  export interface ServiceStatusChanged {
    serviceName: string;
    status: ServiceStatus;
    error?: string;
    details?: Record<string, unknown>;
  }

  export interface ModelLoadingStateChanged {
    state: ModelLoadingState;
    progress?: number;
    error?: string;
  }

  export interface MemoryStored {
    memory: Memory.MemoryChunk;
  }

  export interface MemoryDeleted {
    id: string;
  }

  export interface MemoryCleared {}
}

// Channel names with type safety
export const CHANNELS = {
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
} as const;

// Type-safe channel map
export type ChannelMap = {
  [K in typeof CHANNELS[keyof typeof CHANNELS][keyof typeof CHANNELS[keyof typeof CHANNELS]]]: {
    request: unknown;
    response: IpcResponse<unknown>;
  };
}; 