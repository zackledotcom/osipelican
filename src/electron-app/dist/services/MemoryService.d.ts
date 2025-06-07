import { EventEmitter } from 'events';
export interface MemoryChunk {
    id: string;
    content: string;
    metadata: {
        timestamp: number;
        source?: string;
        type?: string;
        tags?: string[];
        importance?: number;
        context?: {
            conversationId?: string;
            messageId?: string;
            [key: string]: any;
        };
        embedding?: number[];
        [key: string]: any;
    };
    vector?: number[];
    similarity?: number;
    importance?: number;
    expiresAt?: number;
}
export declare class MemoryService extends EventEmitter {
    private static instance;
    private isInitialized;
    private db;
    private embeddingService;
    private vectorStore;
    private cache;
    private readonly CACHE_SIZE;
    private readonly COMPRESSION_THRESHOLD;
    private readonly DEFAULT_EXPIRY;
    private readonly IMPORTANCE_DECAY;
    private constructor();
    static getInstance(): MemoryService;
    initialize(): Promise<{
        success: boolean;
        error?: string;
    }>;
    private startMaintenanceTasks;
    private cleanExpiredMemories;
    private updateImportanceScores;
    private pruneLowImportanceMemories;
    store(chunk: MemoryChunk): Promise<void>;
    private calculateImportance;
    private updateCache;
    search(query: string, options?: {
        limit?: number;
        minImportance?: number;
        type?: string;
        tags?: string[];
        useVectorSearch?: boolean;
    }): Promise<MemoryChunk[]>;
    private processMemoryRow;
    getRecent(limit?: number): Promise<MemoryChunk[]>;
    delete(id: string): Promise<void>;
    clear(): Promise<void>;
    export(path: string): Promise<void>;
    import(path: string): Promise<void>;
    getStats(): Promise<{
        total: number;
        active: number;
        expired: number;
        averageImportance: number;
        cacheSize: number;
    }>;
}
