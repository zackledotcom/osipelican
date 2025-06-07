import { ipcMain } from 'electron';
import fetch, { Response } from 'node-fetch';
import { Readable } from 'stream';

const BACKOFF_DELAYS = [1000, 2000, 3000]; // 1s → 2s → 3s

async function retryRequest<T>(
  requestFn: () => Promise<T>,
  maxAttempts: number = 3
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxAttempts - 1) {
        await new Promise(resolve => setTimeout(resolve, BACKOFF_DELAYS[attempt]));
      }
    }
  }
  
  throw lastError;
}

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

export class OllamaClient {
  private baseUrl: string;
  private currentModel: string;
  private isConnected: boolean = false;

  constructor(baseUrl: string = 'http://localhost:11434') {
    this.baseUrl = baseUrl;
    this.currentModel = 'llama2';
  }

  async checkConnection(): Promise<boolean> {
    try {
      console.log('[OllamaClient] Checking connection to Ollama at:', this.baseUrl);
      const response = await retryRequest(() => 
        fetch(`${this.baseUrl}/api/tags`)
      );
      this.isConnected = response.ok;
      console.log('[OllamaClient] Connection check result:', this.isConnected ? 'Connected' : 'Failed');
      return this.isConnected;
    } catch (error) {
      console.error('[OllamaClient] Connection check failed:', error);
      this.isConnected = false;
      // Emit event to notify the app that Ollama is unavailable
      ipcMain.emit('ollama-unavailable', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        url: this.baseUrl
      });
      return false;
    }
  }

  setModel(modelName: string) {
    this.currentModel = modelName;
  }

  getCurrentModel(): string {
    return this.currentModel;
  }

  async generateResponse(prompt: string, onChunk?: (chunk: string) => void): Promise<OllamaResponse> {
    try {
      const response = await retryRequest(() =>
        fetch(`${this.baseUrl}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: this.currentModel,
            prompt,
            stream: !!onChunk
          })
        })
      ) as Response;

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (onChunk) {
        const reader = (response.body as unknown as ReadableStream<Uint8Array>).getReader();
        if (!reader) throw new Error('Failed to get response reader');

        let fullResponse = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = Buffer.from(value).toString();
          const lines = chunk.split('\n').filter(Boolean);

          for (const line of lines) {
            try {
              const data = JSON.parse(line);
              if (data.response) {
                fullResponse += data.response;
                onChunk(data.response);
              }
            } catch (e) {
              console.error('Failed to parse chunk:', e);
            }
          }
        }

        return {
          content: fullResponse,
          model: this.currentModel,
          created_at: new Date().toISOString()
        };
      } else {
        const data = await response.json();
        return {
          content: data.response,
          model: data.model,
          created_at: new Date().toISOString()
        };
      }
    } catch (error) {
      console.error('[OllamaClient] Generate response failed:', error);
      ipcMain.emit('ollama-unavailable');
      throw new Error('Failed to generate response from Ollama');
    }
  }

  async listModels(): Promise<OllamaModel[]> {
    try {
      const response = await fetch(`${this.baseUrl}/tags`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.models;
    } catch (error) {
      console.error('Failed to list Ollama models:', error);
      throw new Error('Failed to list Ollama models');
    }
  }

  async pullModel(modelName: string, onProgress?: (progress: number) => void): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/pull`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: modelName
        })
      }) as Response;

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (onProgress) {
        const reader = (response.body as unknown as ReadableStream<Uint8Array>).getReader();
        if (!reader) throw new Error('Failed to get response reader');

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = new TextDecoder().decode(value);
          const lines = chunk.split('\n').filter(Boolean);

          for (const line of lines) {
            try {
              const data = JSON.parse(line);
              if (data.status === 'pulling' && data.completed !== undefined) {
                onProgress(data.completed);
              }
            } catch (e) {
              console.error('Failed to parse progress chunk:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to pull Ollama model:', error);
      throw new Error(`Failed to pull model: ${modelName}`);
    }
  }
} 