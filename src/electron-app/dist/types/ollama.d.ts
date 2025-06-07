export interface RequestQueueItem {
    id: string;
    request: () => Promise<any>;
    retries: number;
    maxRetries: number;
    resolve: (value: any) => void;
    reject: (error: Error) => void;
}
export interface StreamParserOptions {
    onChunk: (chunk: string) => void;
    onError: (error: Error) => void;
    onComplete: () => void;
}
export interface OllamaRequestOptions {
    model?: string;
    stream?: boolean;
    context?: number[];
    options?: {
        temperature?: number;
        top_p?: number;
        top_k?: number;
        repeat_penalty?: number;
        stop?: string[];
        [key: string]: any;
    };
}
export interface OllamaResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
}
export interface OllamaModel {
    name: string;
    size: number;
    digest: string;
    modified_at: string;
    details: {
        format: string;
        family: string;
        families: string[];
        parameter_size: string;
        quantization_level: string;
    };
}
export interface OllamaError extends Error {
    code?: string;
    status?: number;
    details?: any;
}
export interface ModelLoadingState {
    status: 'loading' | 'loaded' | 'error';
    isLoading: boolean;
    error?: string;
    progress?: number;
    estimatedTimeRemaining?: number;
    modelName?: string;
}
export interface OllamaConnectionStatus {
    connected: boolean;
    error?: string;
}
