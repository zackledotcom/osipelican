import type { ChatMessage, ChatResponse, OllamaModel, OllamaConnectionStatus } from '../../types/ipc';
import type { StreamParserOptions } from '../../types/ollama';
import { EventEmitter } from 'events';
export declare class OllamaClient extends EventEmitter {
    private static instance;
    private baseUrl;
    private currentModel;
    private fallbackModels;
    private connectionPool;
    private maxConnections;
    private requestQueue;
    private isProcessingQueue;
    private healthCheckInterval;
    private connectionStatus;
    private loadingState;
    private abortController;
    private isInitialized;
    private constructor();
    static getInstance(): OllamaClient;
    private makeRequest;
    initialize(): Promise<void>;
    checkConnection(): Promise<OllamaConnectionStatus>;
    private getWebSocketUrl;
    private createConnection;
    private getConnection;
    private queueRequest;
    private processQueue;
    private parseStream;
    private tryFallbackModel;
    sendMessage(message: ChatMessage): Promise<ChatResponse>;
    sendMessageStream(message: ChatMessage, options: StreamParserOptions): Promise<void>;
    listModels(): Promise<{
        success: boolean;
        error?: string;
        result?: {
            models: OllamaModel[];
        };
    }>;
    setModel(modelName: string): Promise<{
        success: boolean;
        error?: string;
    }>;
    startHealthCheck(interval?: number): void;
    stopHealthCheck(): void;
    getConnectionStatus(): OllamaConnectionStatus;
    getCurrentModel(): string;
    private getModelStatus;
    private loadModel;
    cancelLoad(): Promise<void>;
    generate(message: string): Promise<{
        response: string;
    }>;
    embed(text: string): Promise<number[]>;
    pullModel(modelName: string): Promise<void>;
}
