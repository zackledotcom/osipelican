import { EventEmitter } from 'events';
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
export declare class VectorStoreClient extends EventEmitter {
    private static instance;
    private baseUrl;
    private isInitialized;
    private constructor();
    static getInstance(): VectorStoreClient;
    initialize(): Promise<void>;
    addDocument(document: Omit<VectorDocument, 'id' | 'createdAt' | 'updatedAt'>): Promise<VectorDocument>;
    updateDocument(id: string, document: Partial<VectorDocument>): Promise<VectorDocument>;
    deleteDocument(id: string): Promise<void>;
    search(query: string, options?: {
        limit?: number;
        threshold?: number;
    }): Promise<VectorSearchResult[]>;
    getStats(): Promise<VectorStoreStats>;
    getDocument(id: string): Promise<VectorDocument>;
    listDocuments(options?: {
        limit?: number;
        offset?: number;
    }): Promise<VectorDocument[]>;
}
