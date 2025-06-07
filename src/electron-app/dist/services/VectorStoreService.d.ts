import type { Document } from '../types/ipc';
import { EventEmitter } from 'events';
export declare class VectorStoreService extends EventEmitter {
    private static instance;
    private readonly CHUNK_SIZE;
    private readonly CHUNK_OVERLAP;
    private readonly VECTOR_SIZE;
    private readonly MAX_ELEMENTS;
    private readonly INDEX_PATH;
    private readonly SIMILARITY_THRESHOLD;
    private documents;
    private vectorMap;
    private index;
    private embeddingService;
    private nextId;
    private isInitialized;
    private constructor();
    static getInstance(): VectorStoreService;
    initialize(): Promise<void>;
    private loadDocuments;
    private saveIndex;
    private chunkText;
    addDocument(document: Omit<Document, 'id'>): Promise<void>;
    searchSimilar(query: string, k?: number): Promise<Document[]>;
    deleteDocument(id: string): Promise<void>;
    clear(): Promise<void>;
    getStats(): Promise<{
        totalDocuments: number;
        totalVectors: number;
        indexSize: number;
        maxElements: number;
    }>;
    cleanup(): Promise<void>;
}
