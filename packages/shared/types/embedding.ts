// Shared types for embedding configuration

export interface EmbeddingConfig {
  provider: 'openai' | 'ollama' | 'local' | string;
  apiKey?: string;
  model?: string;
  dimensions?: number;
  [key: string]: any;
} 