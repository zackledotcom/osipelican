// Canonical shared types for Ollama

export interface OllamaModel {
  name: string;
  size: number;
  digest?: string;
  modified_at: string;
  details: {
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
  };
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