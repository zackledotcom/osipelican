import type { ChatMessage, ChatResponse, OllamaModel, OllamaConnectionStatus, ModelLoadingState } from '../../types/ipc';
import type { RequestQueueItem, StreamParserOptions } from '../../types/ollama';

import { EventEmitter } from 'events';
import { logger } from '../../utils/logger';
import fetch, { Response as NodeFetchResponse, RequestInit as NodeFetchRequestInit } from 'node-fetch';

const OLLAMA_BASE_URL = 'http://localhost:11434';
const MAX_RETRIES = 3;
const TIMEOUT_MS = 300000; // 5 minutes
const POLL_INTERVAL = 500; // 500ms

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function withRetryAndTimeout<T>(
  fn: () => Promise<T>,
  retries = MAX_RETRIES
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    return await fn();
  } catch (error) {
    if (retries > 0 && !controller.signal.aborted) {
      await delay(1000 * (MAX_RETRIES - retries));
      return withRetryAndTimeout(fn, retries - 1);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export class OllamaClient extends EventEmitter {
  private static instance: OllamaClient;
  private baseUrl: string;
  private currentModel: string;
  private fallbackModels: string[];
  private connectionPool: Set<WebSocket>;
  private maxConnections: number;
  private requestQueue: RequestQueueItem[];
  private isProcessingQueue: boolean;
  private healthCheckInterval: NodeJS.Timeout | null;
  private connectionStatus: OllamaConnectionStatus;
  private loadingState: ModelLoadingState;
  private abortController: AbortController | null;
  private isInitialized: boolean;

  private constructor() {
    super();
    this.baseUrl = OLLAMA_BASE_URL;
    this.currentModel = 'llama2';
    this.fallbackModels = ['mistral', 'codellama', 'neural-chat'];
    this.connectionPool = new Set();
    this.maxConnections = 5;
    this.requestQueue = [];
    this.isProcessingQueue = false;
    this.healthCheckInterval = null;
    this.connectionStatus = { status: 'disconnected', lastChecked: Date.now() };
    this.loadingState = {
      status: 'loaded',
      isLoading: false,
      modelName: '',
      progress: 0,
      estimatedTimeRemaining: 0
    };
    this.abortController = null;
    this.isInitialized = false;
  }

  public static getInstance(): OllamaClient {
    if (!OllamaClient.instance) {
      OllamaClient.instance = new OllamaClient();
    }
    return OllamaClient.instance;
  }

  private async makeRequest(endpoint: string, options: NodeFetchRequestInit = {}): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    logger.debug(`Making request to ${url}`);
    
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      };

      const response = await fetch(url, {
        ...options,
        headers
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Request failed: ${response.statusText}, ${errorText}`);
      }

      return response.json();
    } catch (error) {
      logger.error(`Request to ${url} failed:`, error);
      throw error;
    }
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.info('OllamaClient already initialized');
      return;
    }

    logger.info('Initializing OllamaClient...');
    
    try {
      logger.debug('Checking Ollama connection...');
      const status = await this.checkConnection();
      
      if (status.status !== 'connected') {
        logger.warn('Ollama service is not available. Some features may be limited.');
        this.connectionStatus = status;
        return;
      }

      // Load available models
      try {
        logger.debug('Loading available models...');
        const models = await this.listModels();
        logger.info(`Successfully loaded ${models.result?.models.length} models: ${models.result?.models.map(m => m.name).join(', ')}`);
        this.emit('modelsLoaded', models.result?.models);
      } catch (error) {
        logger.error('Error loading models:', error);
        // Continue initialization even if model loading fails
      }

      this.connectionStatus = status;
      this.isInitialized = true;
      this.startHealthCheck();
      logger.info('OllamaClient initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize OllamaClient:', error);
      this.connectionStatus = {
        status: 'disconnected',
        lastChecked: Date.now(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  public async checkConnection(): Promise<OllamaConnectionStatus> {
    const retries = 3;
    const delay = 1000;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        logger.debug(`Connection attempt ${attempt}/${retries}...`);
        await this.makeRequest('/api/tags');
        const status: OllamaConnectionStatus = {
          status: 'connected',
          lastChecked: Date.now()
        };
        logger.info('Successfully connected to Ollama service');
        this.connectionStatus = status;
        return status;
      } catch (error) {
        logger.warn(`Connection attempt ${attempt}/${retries} failed. Retrying in ${delay}ms...`, error);
        if (attempt < retries) {
          await new Promise(res => setTimeout(res, delay));
        }
      }
    }
    
    logger.error('All connection attempts failed');
    const status: OllamaConnectionStatus = {
      status: 'disconnected',
      lastChecked: Date.now(),
      error: 'All connection attempts failed'
    };
    this.connectionStatus = status;
    return status;
  }

  private getWebSocketUrl(path: string): string {
    return this.baseUrl
      .replace(/^http:\/\//, 'ws://')
      .replace(/^https:\/\//, 'wss://')
      + path;
  }

  private async createConnection(): Promise<WebSocket> {
    const wsUrl = this.getWebSocketUrl('/api/chat');
    logger.debug(`Creating WebSocket connection to ${wsUrl}`);
    const ws = new WebSocket(wsUrl);
    
    return new Promise((resolve, reject) => {
      ws.onopen = () => {
        logger.info(`WebSocket connection established at ${wsUrl}`);
        resolve(ws);
      };
      ws.onerror = (error) => {
        logger.error('WebSocket connection error:', error);
        reject(error);
      };
      ws.onclose = () => {
        logger.info('WebSocket connection closed');
        this.connectionPool.delete(ws);
      };
    });
  }

  private async getConnection(): Promise<WebSocket> {
    // Try to get an existing connection
    for (const conn of this.connectionPool) {
      if (conn.readyState === WebSocket.OPEN) {
        return conn;
      }
    }

    // Create new connection if pool isn't full
    if (this.connectionPool.size < this.maxConnections) {
      const conn = await this.createConnection();
      this.connectionPool.add(conn);
      return conn;
    }

    // Wait for a connection to become available
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        for (const conn of this.connectionPool) {
          if (conn.readyState === WebSocket.OPEN) {
            clearInterval(checkInterval);
            resolve(conn);
            return;
          }
        }
      }, 100);
    });
  }

  private async queueRequest<T>(
    request: () => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const queueItem: RequestQueueItem = {
        id: Math.random().toString(36).substr(2, 9),
        request,
        retries: 0,
        maxRetries,
        resolve,
        reject,
      };

      this.requestQueue.push(queueItem);
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.isProcessingQueue || this.requestQueue.length === 0) return;

    this.isProcessingQueue = true;
    const item = this.requestQueue[0];

    try {
      const result = await item.request();
      item.resolve(result);
    } catch (error) {
      if (item.retries < item.maxRetries) {
        item.retries++;
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, item.retries) * 1000));
        this.processQueue();
        return;
      }
      item.reject(error as Error);
    }

    this.requestQueue.shift();
    this.isProcessingQueue = false;
    this.processQueue();
  }

  private async parseStream(
    response: NodeFetchResponse,
    options: StreamParserOptions
  ): Promise<void> {
    const text = await response.text();
    const lines = text.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      try {
        const chunk = JSON.parse(line);
        options.onChunk(chunk.response || '');
      } catch (parseError) {
        options.onError(new Error(`Failed to parse chunk: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`));
      }
    }
    options.onComplete();
  }

  private async tryFallbackModel(error: Error): Promise<boolean> {
    const currentIndex = this.fallbackModels.indexOf(this.currentModel);
    if (currentIndex === -1 || currentIndex === this.fallbackModels.length - 1) {
      logger.warn('No more fallback models available');
      return false;
    }

    const nextModel = this.fallbackModels[currentIndex + 1];
    try {
      logger.info(`Attempting to fall back to model ${nextModel}...`);
      const result = await this.setModel(nextModel);
      if (!result.success) {
        throw new Error(result.error || 'Failed to set model');
      }
      logger.info(`Successfully fell back to model ${nextModel}`);
      return true;
    } catch (fallbackError) {
      logger.error(`Failed to fall back to model ${nextModel}:`, fallbackError);
      return false;
    }
  }

  public async sendMessage(message: ChatMessage): Promise<ChatResponse> {
    return this.queueRequest(async () => {
      try {
        return await this.makeRequest('/api/chat', {
          method: 'POST',
          body: JSON.stringify({
            model: this.currentModel,
            messages: [message]
          })
        });
      } catch (error) {
        if (await this.tryFallbackModel(error as Error)) {
          return this.sendMessage(message);
        }
        throw error;
      }
    });
  }

  public async sendMessageStream(
    message: ChatMessage,
    options: StreamParserOptions
  ): Promise<void> {
    return this.queueRequest(async () => {
      try {
        const response = await fetch(`${this.baseUrl}/api/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: this.currentModel,
            messages: [message],
            stream: true
          })
        });

        if (!response.ok) {
          throw new Error(`Ollama API error: ${response.statusText}`);
        }

        const text = await response.text();
        const lines = text.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const chunk = JSON.parse(line);
            options.onChunk(chunk.response || '');
          } catch (parseError) {
            options.onError(new Error(`Failed to parse chunk: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`));
          }
        }
        options.onComplete();
      } catch (error) {
        if (await this.tryFallbackModel(error as Error)) {
          return this.sendMessageStream(message, options);
        }
        throw error;
      }
    });
  }

  public async listModels(): Promise<{ success: boolean; error?: string; result?: { models: OllamaModel[] } }> {
    return this.queueRequest(async () => {
      try {
        const data = await this.makeRequest('/api/tags');
        if (!data || !data.models || !Array.isArray(data.models)) {
          logger.error('Invalid response format from Ollama API:', data);
          return { 
            success: false, 
            error: 'Invalid response format from Ollama API' 
          };
        }
        const models = data.models.map((model: any) => ({
          name: model.name,
          size: model.size || 0,
          digest: model.digest || '',
          modified_at: model.modified_at || new Date().toISOString(),
          details: {
            format: model.details?.format || 'gguf',
            family: model.details?.family || 'llama',
            families: model.details?.families || ['llama'],
            parameter_size: model.details?.parameter_size || '7B',
            quantization_level: model.details?.quantization_level || 'Q4_0'
          }
        }));
        return { 
          success: true, 
          result: { models } 
        };
      } catch (error) {
        logger.error('Error listing models:', error);
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Failed to list models' 
        };
      }
    });
  }

  public async setModel(modelName: string): Promise<{ success: boolean; error?: string }> {
    if (this.currentModel === modelName) {
      return { success: true };
    }

    try {
      await this.loadModel(modelName);
      this.currentModel = modelName;
      return { success: true };
    } catch (error) {
      logger.error(`Failed to set model to ${modelName}:`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  public startHealthCheck(interval: number = 30000): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(async () => {
      const status = await this.checkConnection();
      this.emit('healthCheck', status);
    }, interval);
  }

  public stopHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  public getConnectionStatus(): OllamaConnectionStatus {
    return this.connectionStatus;
  }

  public getCurrentModel(): string {
    return this.currentModel;
  }

  private async getModelStatus(modelName: string): Promise<{ progress: number }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      const data = await response.json();
      const model = data.models.find((m: any) => m.name === modelName);
      return {
        progress: model ? 100 : 0
      };
    } catch (error) {
      console.error('Error getting model status:', error);
      return { progress: 0 };
    }
  }

  private async loadModel(modelName: string): Promise<void> {
    const startTime = Date.now();
    this.loadingState = {
      status: 'loading',
      isLoading: true,
      modelName,
      progress: 0,
      estimatedTimeRemaining: 0
    };
    this.emit('modelLoadingStateChanged', this.loadingState);

    try {
      // Poll model status every 500ms
      const pollInterval = setInterval(async () => {
        const status = await this.getModelStatus(modelName);
        this.loadingState.progress = status.progress;
        this.emit('modelLoadingStateChanged', this.loadingState);
      }, POLL_INTERVAL);

      this.abortController = new AbortController();
      const response = await fetch(`${this.baseUrl}/api/pull`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: modelName, stream: true }),
        signal: this.abortController.signal
      });

      if (!response.ok) {
        throw new Error(`Failed to load model: ${response.statusText}`);
      }

      const text = await response.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          if (data.status === 'pulling') {
            this.loadingState.progress = data.completed || 0;
            this.loadingState.estimatedTimeRemaining = data.remaining || 0;
            this.emit('modelLoadingStateChanged', this.loadingState);
          }
        } catch (error) {
          logger.error('Error parsing stream:', error);
        }
      }

      clearInterval(pollInterval);
      this.loadingState.isLoading = false;
      this.emit('modelLoadingStateChanged', this.loadingState);
    } catch (error) {
      this.loadingState.isLoading = false;
      this.loadingState.error = error instanceof Error ? error.message : 'Failed to load model';
      this.emit('modelLoadingStateChanged', this.loadingState);
      throw error;
    } finally {
      this.abortController = null;
    }
  }

  public async cancelLoad(): Promise<void> {
    if (this.abortController) {
      this.abortController.abort();
      this.loadingState.isLoading = false;
      this.loadingState.error = 'Model loading cancelled';
      this.emit('modelLoadingStateChanged', this.loadingState);
    }
  }

  public async generate(message: string): Promise<{ response: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.currentModel,
          prompt: message,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate response: ${response.statusText}`);
      }

      const data = await response.json();
      return { response: data.response };
    } catch (error) {
      logger.error('Error generating response:', error);
      throw error;
    }
  }

  public async embed(text: string): Promise<number[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.currentModel,
          prompt: text,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate embedding: ${response.statusText}`);
      }

      const data = await response.json();
      return data.embedding;
    } catch (error) {
      logger.error('Error generating embedding:', error);
      throw error;
    }
  }

  public async pullModel(modelName: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/pull`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name: modelName })
    });

    if (!response.ok) {
      throw new Error(`Failed to pull model: ${response.statusText}`);
    }

    const text = await response.text();
    const lines = text.split('\n').filter(line => line.trim());

    try {
      for (const line of lines) {
        if (line.trim()) {
          try {
            const status = JSON.parse(line);
            this.emit('modelLoadingStateChanged', {
              status: 'loading',
              isLoading: true,
              modelName,
              progress: status.progress || 0,
              estimatedTimeRemaining: status.estimatedTimeRemaining
            });
          } catch (parseError) {
            logger.error('Failed to parse pull status:', parseError);
          }
        }
      }

      this.emit('modelLoadingStateChanged', {
        status: 'loaded',
        isLoading: false,
        modelName,
        progress: 100
      });
    } catch (error) {
      this.emit('modelLoadingStateChanged', {
        status: 'error',
        isLoading: false,
        modelName,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
}