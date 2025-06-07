export interface EmbeddingConfig {
    provider: 'openai' | 'ollama' | 'local' | string;
    apiKey?: string;
    model?: string;
    dimensions?: number;
    [key: string]: any;
}
