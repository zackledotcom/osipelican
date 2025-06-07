import type { ChatMessage, ChatResponse, OllamaModel, OllamaConnectionStatus } from '../types/ipc';
export declare class OllamaClient {
    private currentModel;
    sendMessage(message: ChatMessage): Promise<ChatResponse>;
    sendMessageStream(message: ChatMessage, onChunk: (chunk: string) => void): Promise<void>;
    healthCheck(): Promise<{
        status: 'ok' | 'error';
        message?: string;
    }>;
    listModels(): Promise<OllamaModel[]>;
    setModel(model: string): Promise<{
        success: boolean;
        message?: string;
    }>;
    checkConnection(): Promise<OllamaConnectionStatus>;
}
