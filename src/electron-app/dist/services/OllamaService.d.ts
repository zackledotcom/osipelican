import { BaseService, ServiceConfig } from './Service';
export interface ModelLoadingState {
    status: 'loading' | 'loaded' | 'error';
    isLoading: boolean;
    modelName: string;
    progress: number;
    estimatedTimeRemaining?: number;
    error?: string;
}
export interface OllamaResponse {
    model: string;
    created_at: string;
    response: string;
    done: boolean;
}
export interface OllamaEmbeddingResponse {
    embedding: number[];
}
export declare class OllamaService extends BaseService {
    private client;
    private currentModel;
    private fallbackResponses;
    private responseMonitor;
    private eventEmitter;
    private static instance;
    private readonly BASE_URL;
    private isInitialized;
    constructor(config: ServiceConfig);
    static getInstance(): OllamaService;
    protected initialize(): Promise<void>;
    isAvailable(): Promise<boolean>;
    protected cleanup(): Promise<void>;
    protected checkHealth(): Promise<boolean>;
    private getFallbackResponse;
    listModels(): Promise<string[]>;
    setModel(modelName: string): Promise<void>;
    getCurrentModel(): string;
    cancelLoad(): Promise<void>;
    private callOllama;
    generateResponse(prompt: string, context: string): Promise<string>;
    private handleTruncation;
    private handleHallucinations;
    private shortenPrompt;
    private reinforceContext;
    private estimateTokenCount;
    isServiceAvailable(): boolean;
    getConnectionStatus(): {
        isConnected: boolean;
        isFallbackMode: boolean;
        lastSuccessfulConnection: number;
        connectionAttempts: number;
    };
    pullModel(modelName: string): Promise<void>;
    generateEmbedding(text: string, modelName: string): Promise<OllamaEmbeddingResponse>;
}
