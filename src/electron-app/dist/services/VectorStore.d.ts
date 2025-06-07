import { Vector } from '../types/ipc';
export declare class VectorStore {
    private vectors;
    update(id: string, content: string): Promise<void>;
    get(id: string): Promise<Vector | undefined>;
    list(): Promise<Vector[]>;
    add(vector: Vector): Promise<void>;
    delete(id: string): Promise<void>;
    clear(): Promise<void>;
    search(query: string): Promise<Vector[]>;
    stats(): Promise<{
        count: number;
        dimensions: number;
    }>;
}
export declare const vectorStore: VectorStore;
