import { BaseService, ServiceConfig } from './Service';
import { logger } from '../utils/logger';
import { EmbeddingService } from './EmbeddingService';
import { VectorStoreService } from './VectorStoreService';
import { Document } from '@shared/types/ipc';

export interface ChunkConfig {
  chunkSize: number;
  chunkOverlap: number;
}

export interface RAGConfig extends ServiceConfig {
  chunkConfig: ChunkConfig;
  embeddingModel: string;
}

interface SearchResult {
  text: string;
  score: number;
  metadata: Record<string, any>;
}

export class RAGService extends BaseService {
  private static instance: RAGService;
  private embeddingService: EmbeddingService;
  private vectorStore: VectorStoreService;
  private chunkConfig: ChunkConfig;
  private embeddingModel: string;

  private constructor(config: RAGConfig) {
    super(config);
    this.chunkConfig = config.chunkConfig;
    this.embeddingModel = config.embeddingModel;
    this.embeddingService = EmbeddingService.getInstance();
    this.vectorStore = VectorStoreService.getInstance();
  }

  public static getInstance(): RAGService {
    if (!RAGService.instance) {
      RAGService.instance = new RAGService({
        name: 'rag',
        autoStart: true,
        restartOnCrash: true,
        maxRestarts: 3,
        restartDelay: 1000,
        chunkConfig: {
          chunkSize: 1000,
          chunkOverlap: 200,
        },
        embeddingModel: 'nomic-embed-text',
      });
    }
    return RAGService.instance;
  }

  protected async initialize(): Promise<void> {
    try {
      logger.info('Initializing RAGService');
      await this.embeddingService.initialize();
      await this.vectorStore.initialize();
      logger.info('RAGService initialized successfully');
    } catch (error) {
      logger.error('Error initializing RAGService:', error);
      throw error;
    }
  }

  private chunkText(text: string): string[] {
    const chunks: string[] = [];
    let startIndex = 0;

    while (startIndex < text.length) {
      const endIndex = Math.min(
        startIndex + this.chunkConfig.chunkSize,
        text.length
      );
      chunks.push(text.slice(startIndex, endIndex));
      startIndex = endIndex - this.chunkConfig.chunkOverlap;
    }

    return chunks;
  }

  async addDocument(document: Document): Promise<void> {
    try {
      logger.info(`Adding document: ${document.id}`);
      const chunks = this.chunkText(document.content);
      
      for (const chunk of chunks) {
        const embedding = await this.embeddingService.generateEmbedding(chunk);
        
        await this.vectorStore.addDocument({
          content: chunk,
          metadata: {
            ...document.metadata,
            chunkIndex: chunks.indexOf(chunk),
            totalChunks: chunks.length,
            text: chunk,
          },
        });
      }
      
      logger.info(`Document ${document.id} added successfully`);
    } catch (error) {
      logger.error(`Error adding document ${document.id}:`, error);
      throw error;
    }
  }

  async search(query: string, k: number = 5): Promise<SearchResult[]> {
    try {
      logger.info(`Searching for: ${query}`);
      const results = await this.vectorStore.searchSimilar(query, k);

      return results.map((result) => ({
        text: result.content,
        score: 1.0, // TODO: Implement proper scoring
        metadata: result.metadata,
      }));
    } catch (error) {
      logger.error('Error searching:', error);
      throw error;
    }
  }

  async deleteDocument(documentId: string): Promise<void> {
    try {
      logger.info(`Deleting document: ${documentId}`);
      await this.vectorStore.deleteDocument(documentId);
      logger.info(`Document ${documentId} deleted successfully`);
    } catch (error) {
      logger.error(`Error deleting document ${documentId}:`, error);
      throw error;
    }
  }

  protected async cleanup(): Promise<void> {
    try {
      await this.vectorStore.cleanup();
      logger.info('RAGService cleaned up successfully');
    } catch (error) {
      logger.error('Error cleaning up RAGService:', error);
      throw error;
    }
  }

  protected async checkHealth(): Promise<boolean> {
    try {
      const stats = await this.vectorStore.getStats();
      return stats.totalDocuments > 0;
    } catch (error) {
      logger.error('Health check failed:', error);
      return false;
    }
  }
} 