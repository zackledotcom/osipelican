import { logger } from '../utils/logger';
import type { Document } from '@shared/types/ipc';
import { v4 as uuidv4 } from 'uuid';
import hnswlib from 'hnswlib-node';
import path from 'path';
import { app } from 'electron';
import { EmbeddingService } from './EmbeddingService';
import { EventEmitter } from 'events';

// Type declaration for HierarchicalNSW
interface HierarchicalNSW {
  new (space: string, dim: number): any;
  initIndex(maxElements: number): Promise<void>;
  readIndex(path: string): Promise<void>;
  writeIndex(path: string): Promise<void>;
  addPoint(point: number[], label: number): Promise<void>;
  searchKnn(query: number[], k: number): Promise<{neighbors: number[]}>;
  clearIndex(): Promise<void>;
  getMaxElements(): number;
  getCurrentCount(): number;
  resizeIndex(newSize: number): Promise<void>;
}

interface VectorEntry {
  id: string;
  document: Document;
  vectorId: number;
}

export class VectorStoreService extends EventEmitter {
  private static instance: VectorStoreService;
  private readonly CHUNK_SIZE = 1000;
  private readonly CHUNK_OVERLAP = 200;
  private readonly VECTOR_SIZE = 1536; // OpenAI embedding dimension
  private readonly MAX_ELEMENTS = 100000; // Maximum number of vectors to store
  private readonly INDEX_PATH = 'vector-store';
  private readonly SIMILARITY_THRESHOLD = 0.7;

  private documents: Map<string, Document> = new Map();
  private vectorMap: Map<number, string> = new Map(); // Maps vector IDs to document IDs
  private index!: HierarchicalNSW;
  private embeddingService: EmbeddingService;
  private nextId: number = 0;
  private isInitialized = false;

  private constructor(embeddingService: EmbeddingService) {
    super();
    this.embeddingService = embeddingService;
  }

  public static getInstance(): VectorStoreService {
    if (!VectorStoreService.instance) {
      const embeddingService = EmbeddingService.getInstance();
      VectorStoreService.instance = new VectorStoreService(embeddingService);
    }
    return VectorStoreService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      logger.info('Initializing VectorStoreService');
      
      // Initialize HNSW index
      this.index = new (hnswlib as any).HierarchicalNSW('cosine', this.VECTOR_SIZE);
      await this.index.initIndex(this.MAX_ELEMENTS);

      // Load existing index if available
      const indexPath = path.join(app.getPath('userData'), this.INDEX_PATH);
      try {
        await this.index.readIndex(indexPath);
        await this.loadDocuments();
        logger.info('Loaded existing vector store index');
      } catch (e) {
        logger.info('No existing index found, creating new one');
      }

      this.isInitialized = true;
      this.emit('initialized');
    } catch (error) {
      logger.error('Error initializing vector store:', error);
      throw error;
    }
  }

  private async loadDocuments(): Promise<void> {
    try {
      // TODO: Implement document loading from disk
      logger.info('Loading documents from disk');
    } catch (error) {
      logger.error('Error loading documents:', error);
      throw error;
    }
  }

  private async saveIndex(): Promise<void> {
    try {
      const indexPath = path.join(app.getPath('userData'), this.INDEX_PATH);
      await this.index.writeIndex(indexPath);
      logger.info('Saved vector store index');
    } catch (error) {
      logger.error('Error saving vector store index:', error);
      throw error;
    }
  }

  private chunkText(text: string): string[] {
    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      const end = Math.min(start + this.CHUNK_SIZE, text.length);
      let chunk = text.slice(start, end);

      // If we're not at the end, try to find a good break point
      if (end < text.length) {
        const lastPeriod = chunk.lastIndexOf('.');
        const lastSpace = chunk.lastIndexOf(' ');
        
        if (lastPeriod > this.CHUNK_SIZE - this.CHUNK_OVERLAP) {
          chunk = chunk.slice(0, lastPeriod + 1);
          start = start + lastPeriod + 1;
        } else if (lastSpace > this.CHUNK_SIZE - this.CHUNK_OVERLAP) {
          chunk = chunk.slice(0, lastSpace + 1);
          start = start + lastSpace + 1;
        } else {
          start = end;
        }
      } else {
        start = end;
      }

      chunks.push(chunk);
    }

    return chunks;
  }

  async addDocument(document: Omit<Document, 'id'>): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Vector store not initialized');
    }

    try {
      const id = uuidv4();
      const chunks = this.chunkText(document.content);

      for (const chunk of chunks) {
        const chunkId = uuidv4();
        const chunkDoc: Document = {
          id: chunkId,
          content: chunk,
          metadata: {
            ...document.metadata,
            originalId: id,
            chunkIndex: chunks.indexOf(chunk),
            totalChunks: chunks.length,
          },
        };

        // Generate embedding
        const embedding = await this.embeddingService.generateEmbedding(chunk);

        // Add to vector store
        await this.index.addPoint(embedding, this.nextId);
        this.vectorMap.set(this.nextId, chunkId);
        this.documents.set(chunkId, chunkDoc);
        this.nextId++;

        // Check if we need to resize the index
        if (this.nextId >= this.index.getMaxElements()) {
          const newSize = Math.min(this.index.getMaxElements() * 2, this.MAX_ELEMENTS);
          await this.index.resizeIndex(newSize);
          logger.info(`Resized vector store index to ${newSize} elements`);
        }
      }

      // Save index periodically
      if (this.nextId % 100 === 0) {
        await this.saveIndex();
      }

      this.emit('documentAdded', id);
    } catch (error) {
      logger.error('Error adding document:', error);
      throw error;
    }
  }

  async searchSimilar(query: string, k: number = 5): Promise<Document[]> {
    if (!this.isInitialized) {
      throw new Error('Vector store not initialized');
    }

    try {
      // Generate query embedding
      const queryEmbedding = await this.embeddingService.generateEmbedding(query);

      // Search for similar vectors
      const { neighbors } = await this.index.searchKnn(queryEmbedding, k);

      // Map vector IDs back to documents
      const results: Document[] = [];
      for (const neighborId of neighbors) {
        const docId = this.vectorMap.get(neighborId);
        if (docId) {
          const doc = this.documents.get(docId);
          if (doc) {
            results.push(doc);
          }
        }
      }

      return results;
    } catch (error) {
      logger.error('Error searching documents:', error);
      throw error;
    }
  }

  async deleteDocument(id: string): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Vector store not initialized');
    }

    try {
      // Delete all chunks associated with the document
      for (const [chunkId, doc] of this.documents.entries()) {
        if (doc.metadata.originalId === id) {
          this.documents.delete(chunkId);
          // Note: We can't remove from HNSW index, but we can mark as deleted
          // in the vectorMap by setting to null
          for (const [vectorId, docId] of this.vectorMap.entries()) {
            if (docId === chunkId) {
              this.vectorMap.set(vectorId, '');
            }
          }
        }
      }

      this.emit('documentDeleted', id);
    } catch (error) {
      logger.error('Error deleting document:', error);
      throw error;
    }
  }

  async clear(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Vector store not initialized');
    }

    try {
      this.documents.clear();
      this.vectorMap.clear();
      await this.index.clearIndex();
      this.nextId = 0;
      this.emit('cleared');
    } catch (error) {
      logger.error('Error clearing vector store:', error);
      throw error;
    }
  }

  async getStats(): Promise<{
    totalDocuments: number;
    totalVectors: number;
    indexSize: number;
    maxElements: number;
  }> {
    if (!this.isInitialized) {
      throw new Error('Vector store not initialized');
    }

    return {
      totalDocuments: this.documents.size,
      totalVectors: this.nextId,
      indexSize: this.index.getCurrentCount(),
      maxElements: this.index.getMaxElements(),
    };
  }

  async cleanup(): Promise<void> {
    if (!this.isInitialized) return;

    try {
      await this.saveIndex();
      this.isInitialized = false;
    } catch (error) {
      logger.error('Error cleaning up vector store:', error);
      throw error;
    }
  }
}
