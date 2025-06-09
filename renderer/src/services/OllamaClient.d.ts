interface OllamaResponse {
    content: string;
    model: string;
    created_at: string;
}
interface OllamaModel {
    name: string;
    size: number;
    digest: string;
    details: {
        format: string;
        family: string;
        parameter_size: string;
        quantization_level: string;
    };
}
export declare class OllamaClient {
    private baseUrl;
    private currentModel;
    private isConnected;
    constructor(baseUrl?: string);
    checkConnection(): Promise<boolean>;
    setModel(modelName: string): void;
    getCurrentModel(): string;
    generateResponse(prompt: string, onChunk?: (chunk: string) => void): Promise<OllamaResponse>;
    listModels(): Promise<OllamaModel[]>;
    pullModel(modelName: string, onProgress?: (progress: number) => void): Promise<void>;
}
export {};
