import { BaseService, ServiceConfig } from './Service';
import { Document } from '../types/ipc';
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
export declare class RAGService extends BaseService {
    private static instance;
    private embeddingService;
    private vectorStore;
    private chunkConfig;
    private embeddingModel;
    private constructor();
    static getInstance(): RAGService;
    protected initialize(): Promise<void>;
    private chunkText;
    addDocument(document: Document): Promise<void>;
    search(query: string, k?: number): Promise<SearchResult[]>;
    deleteDocument(documentId: string): Promise<void>;
    protected cleanup(): Promise<void>;
    protected checkHealth(): Promise<boolean>;
}
export {};
