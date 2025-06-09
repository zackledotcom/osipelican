import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';
import { OllamaClient } from './OllamaClient';
import { logger } from '../utils/logger';
import { Role, ChatResponse } from '@shared/types/chat';
import { ResponseMonitor } from '../utils/responseMonitor';
import type { OllamaModel } from '@shared/types/ollama';
import { BaseService, ServiceConfig, ServiceStatus } from './Service';

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

export class OllamaService extends BaseService {
  private client: OllamaClient;
  private currentModel: string;
  private fallbackResponses: Map<string, string> = new Map([
    ['error', 'I apologize, but I am currently unable to process your request. The Ollama service is temporarily unavailable.'],
    ['greeting', 'Hello! I am currently operating in limited mode. Some features may be unavailable.'],
    ['help', 'I can help you with basic tasks, but advanced features are currently unavailable due to service limitations.']
  ]);
  private responseMonitor: ResponseMonitor;
  private eventEmitter: EventEmitter;
  private static instance: OllamaService;
  private readonly BASE_URL = 'http://localhost:11434';
  private isInitialized = false;

  constructor(config: ServiceConfig) {
    super(config);
    this.client = new OllamaClient();
    this.currentModel = '';
    this.responseMonitor = ResponseMonitor.getInstance();
    this.eventEmitter = new EventEmitter();

    // Forward model loading state changes from the client
    this.eventEmitter.on('modelLoading', (model: string) => {
      this.emit('modelLoading', model);
    });

    this.eventEmitter.on('modelLoaded', (model: string) => {
      this.emit('modelLoaded', model);
    });
  }

  public static getInstance(): OllamaService {
    if (!OllamaService.instance) {
      OllamaService.instance = new OllamaService({
        name: 'ollama',
        autoStart: true,
        restartOnCrash: true,
        maxRestarts: 3,
        restartDelay: 1000,
      });
    }
    return OllamaService.instance;
  }

  protected async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      logger.info('Initializing OllamaService');
      const isAvailable = await this.isAvailable();
      if (!isAvailable) {
        throw new Error('Ollama service is not available');
      }
      this.isInitialized = true;
      this.emit('initialized');
      logger.info('OllamaService initialized successfully');
    } catch (error) {
      logger.error('Error initializing OllamaService:', error);
      throw error;
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.BASE_URL}/api/tags`);
      return response.ok;
    } catch (error) {
      logger.warn('Ollama service is not available:', error);
      return false;
    }
  }

  protected async cleanup(): Promise<void> {
    if (!this.isInitialized) return;
    this.isInitialized = false;
  }

  protected async checkHealth(): Promise<boolean> {
    return await this.isAvailable();
  }

  private getFallbackResponse(message: string): ChatResponse {
    // Simple keyword matching for fallback responses
    const lowerMessage = message.toLowerCase();
    let responseType = 'error';

    if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
      responseType = 'greeting';
    } else if (lowerMessage.includes('help') || lowerMessage.includes('what can you do')) {
      responseType = 'help';
    }

    return {
      id: uuidv4(),
      content: this.fallbackResponses.get(responseType) || this.fallbackResponses.get('error')!,
      role: Role.Assistant,
      timestamp: Date.now()
    };
  }

  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.BASE_URL}/api/tags`);
      if (!response.ok) {
        throw new Error(`Failed to list models: ${response.statusText}`);
      }
      const data = await response.json();
      return data.models.map((model: OllamaModel) => model.name);
    } catch (error) {
      logger.error('Error listing models:', error);
      throw error;
    }
  }

  async setModel(modelName: string): Promise<void> {
    try {
      this.client.setModel(modelName);
      this.currentModel = modelName;
    } catch (error) {
      this.logger.error('Error setting model:', error);
      throw error;
    }
  }

  getCurrentModel(): string {
    return this.currentModel;
  }

  async cancelLoad(): Promise<void> {
    try {
      // No cancel load method in OllamaClient
    } catch (error) {
      this.logger.error('Error canceling load:', error);
      throw error;
    }
  }

  private async callOllama(prompt: string): Promise<string> {
    const isConnected = await this.client.checkConnection();
    if (!isConnected) {
      throw new Error('Ollama service is not available');
    }

    const response = await this.client.generateResponse(prompt);
    return response.content;
  }

  async generateResponse(prompt: string, context: string): Promise<string> {
    const startTime = Date.now();
    try {
      // Get response from Ollama
      const response = await this.callOllama(prompt);
      
      // Analyze response quality
      const metrics = await this.responseMonitor.analyzeResponse(
        response,
        context,
        startTime,
        this.estimateTokenCount(response)
      );

      // Handle quality issues
      if (metrics.isTruncated || metrics.potentialHallucinations.length > 0) {
        this.logger.warn('Response quality issues detected:', metrics);
        
        // If truncated, try to get a complete response
        if (metrics.isTruncated) {
          return await this.handleTruncation(prompt, context);
        }
        
        // If hallucinations detected, try to get a more accurate response
        if (metrics.potentialHallucinations.length > 0) {
          return await this.handleHallucinations(prompt, context, metrics);
        }
      }

      return response;
    } catch (error) {
      this.logger.error('Error generating response:', error);
      throw error;
    }
  }

  private async handleTruncation(prompt: string, context: string): Promise<string> {
    // Implement truncation handling strategy
    this.logger.info('Handling truncated response...');
    
    // Try with a shorter prompt
    const shorterPrompt = this.shortenPrompt(prompt);
    return await this.callOllama(shorterPrompt);
  }

  private async handleHallucinations(
    prompt: string,
    context: string,
    metrics: any
  ): Promise<string> {
    // Implement hallucination handling strategy
    this.logger.info('Handling potential hallucinations...');
    
    // Try with reinforced context
    const reinforcedPrompt = this.reinforceContext(prompt, context);
    return await this.callOllama(reinforcedPrompt);
  }

  private shortenPrompt(prompt: string): string {
    // Implement prompt shortening logic
    return prompt.split('\n').slice(0, 3).join('\n');
  }

  private reinforceContext(prompt: string, context: string): string {
    // Implement context reinforcement logic
    return `${context}\n\n${prompt}`;
  }

  private estimateTokenCount(text: string): number {
    // Implement token estimation logic
    return Math.ceil(text.length / 4);
  }

  isServiceAvailable(): boolean {
    return this.status === ServiceStatus.RUNNING;
  }

  getConnectionStatus(): { 
    isConnected: boolean; 
    isFallbackMode: boolean; 
    lastSuccessfulConnection: number;
    connectionAttempts: number;
  } {
    return {
      isConnected: this.status === ServiceStatus.RUNNING,
      isFallbackMode: this.status === ServiceStatus.ERROR,
      lastSuccessfulConnection: this.startTime,
      connectionAttempts: this.restartAttempts
    };
  }

  async pullModel(modelName: string): Promise<void> {
    try {
      const response = await fetch(`${this.BASE_URL}/api/pull`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: modelName,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to pull model: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Failed to get response reader');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        // Process streaming response if needed
      }
    } catch (error) {
      logger.error('Error pulling model:', error);
      throw error;
    }
  }

  async generateEmbedding(text: string, modelName: string): Promise<OllamaEmbeddingResponse> {
    try {
      const response = await fetch(`${this.BASE_URL}/api/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: modelName,
          prompt: text,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate embedding: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      logger.error('Error generating embedding:', error);
      throw error;
    }
  }
} 