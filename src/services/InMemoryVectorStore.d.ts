interface VectorEntry {
    id: string;
    vector: number[];
    metadata: any;
}
interface SearchResult extends VectorEntry {
    similarity: number;
}
export declare class InMemoryVectorStore {
    private vectors;
    private dimension;
    constructor(dimension?: number);
    add(id: string, vector: number[], metadata?: any): void;
    search(queryVector: number[], k?: number): SearchResult[];
    delete(id: string): void;
    clear(): void;
    size(): number;
    private cosineSimilarity;
}
export {};
