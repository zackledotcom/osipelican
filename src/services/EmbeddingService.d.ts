import { EventEmitter } from 'events';
export type ServiceStatus = 'operational' | 'degraded' | 'unavailable';
export interface EmbeddingConfig {
    model: string;
    modelParameters: {
        temperature: number;
        topK: number;
        topP: number;
        contextWindow: number;
        repeatPenalty: number;
        presencePenalty: number;
        frequencyPenalty: number;
        mirostatMode: number;
        mirostatTau: number;
        mirostatEta: number;
    };
    batchSize: number;
    normalize: boolean;
    truncateStrategy: 'NONE' | 'FIRST' | 'LAST' | 'MIDDLE';
    maxTokens: number;
    chunkSize: number;
    chunkOverlap: number;
    chunkStrategy: 'SENTENCE' | 'PARAGRAPH' | 'FIXED';
    enableCache: boolean;
    cacheSize: number;
    cacheTTL: number;
    parallelProcessing: boolean;
    maxConcurrentRequests: number;
    timeout: number;
    minSimilarityThreshold: number;
    maxResults: number;
    rerankResults: boolean;
}
export declare class EmbeddingService extends EventEmitter {
    private static instance;
    private ollamaService;
    private isInitialized;
    private readonly MODEL_NAME;
    private readonly BATCH_SIZE;
    private readonly MAX_RETRIES;
    private readonly RETRY_DELAY;
    private config;
    private status;
    private fallbackStore;
    private readonly defaultConfig;
    private constructor();
    static getInstance(): EmbeddingService;
    initialize(): Promise<void>;
    getStatus(): ServiceStatus;
    updateConfig(newConfig: Partial<EmbeddingConfig>): Promise<void>;
    getConfig(): EmbeddingConfig;
    private truncateText;
    private chunkText;
    private generateFallbackEmbedding;
    generateEmbedding(text: string): Promise<number[]>;
    generateEmbeddings(texts: string[]): Promise<number[][]>;
    private chunkArray;
    storeEmbedding(text: string, metadata?: any): Promise<string>;
    searchSimilar(query: string, k?: number): Promise<Array<{
        id: string;
        similarity: number;
        metadata: any;
    }>>;
    rerankResults(query: string, results: {
        text: string;
        score: number;
    }[]): Promise<{
        text: string;
        score: number;
    }[]>;
    private cosineSimilarity;
    cleanup(): Promise<void>;
}
