import { EventEmitter } from 'events';
import { logger } from '../../utils/logger';
import fetch from 'node-fetch';

export interface VectorDocument {
  id: string;
  content: string;
  metadata: Record<string, any>;
  embedding?: number[];
  createdAt: Date;
  updatedAt: Date;
}

export interface VectorSearchResult {
  document: VectorDocument;
  score: number;
}

export interface VectorStoreStats {
  totalDocuments: number;
  totalVectors: number;
  dimensions: number;
  lastUpdated: Date;
}

export class VectorStoreClient extends EventEmitter {
  private static instance: VectorStoreClient;
  private baseUrl: string;
  private isInitialized: boolean;

  private constructor() {
    super();
    this.baseUrl = 'http://localhost:11434/api/vector';
    this.isInitialized = false;
  }

  public static getInstance(): VectorStoreClient {
    if (!VectorStoreClient.instance) {
      VectorStoreClient.instance = new VectorStoreClient();
    }
    return VectorStoreClient.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.info('VectorStoreClient already initialized');
      return;
    }

    try {
      logger.info('Initializing VectorStoreClient...');
      // Check if vector store is available
      const response = await fetch(`${this.baseUrl}/status`);
      if (!response.ok) {
        throw new Error(`Vector store not available: ${response.statusText}`);
      }
      
      this.isInitialized = true;
      logger.info('VectorStoreClient initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize VectorStoreClient:', error);
      throw error;
    }
  }

  public async addDocument(document: Omit<VectorDocument, 'id' | 'createdAt' | 'updatedAt'>): Promise<VectorDocument> {
    try {
      const response = await fetch(`${this.baseUrl}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(document)
      });

      if (!response.ok) {
        throw new Error(`Failed to add document: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      logger.error('Error adding document:', error);
      throw error;
    }
  }

  public async updateDocument(id: string, document: Partial<VectorDocument>): Promise<VectorDocument> {
    try {
      const response = await fetch(`${this.baseUrl}/documents/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(document)
      });

      if (!response.ok) {
        throw new Error(`Failed to update document: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      logger.error('Error updating document:', error);
      throw error;
    }
  }

  public async deleteDocument(id: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/documents/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`Failed to delete document: ${response.statusText}`);
      }
    } catch (error) {
      logger.error('Error deleting document:', error);
      throw error;
    }
  }

  public async search(query: string, options: { limit?: number; threshold?: number } = {}): Promise<VectorSearchResult[]> {
    try {
      const response = await fetch(`${this.baseUrl}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, ...options })
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      logger.error('Error searching documents:', error);
      throw error;
    }
  }

  public async getStats(): Promise<VectorStoreStats> {
    try {
      const response = await fetch(`${this.baseUrl}/stats`);
      if (!response.ok) {
        throw new Error(`Failed to get stats: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      logger.error('Error getting vector store stats:', error);
      throw error;
    }
  }

  public async getDocument(id: string): Promise<VectorDocument> {
    try {
      const response = await fetch(`${this.baseUrl}/documents/${id}`);
      if (!response.ok) {
        throw new Error(`Failed to get document: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      logger.error('Error getting document:', error);
      throw error;
    }
  }

  public async listDocuments(options: { limit?: number; offset?: number } = {}): Promise<VectorDocument[]> {
    try {
      const queryParams = new URLSearchParams();
      if (options.limit) queryParams.append('limit', options.limit.toString());
      if (options.offset) queryParams.append('offset', options.offset.toString());

      const response = await fetch(`${this.baseUrl}/documents?${queryParams}`);
      if (!response.ok) {
        throw new Error(`Failed to list documents: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      logger.error('Error listing documents:', error);
      throw error;
    }
  }
} 