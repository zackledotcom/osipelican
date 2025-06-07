import type { RequestQueueItem } from '../types/ollama';
export declare class RequestQueue<T> {
    private delayFn;
    private queue;
    private isProcessing;
    constructor(delayFn: (ms: number) => Promise<void>);
    enqueue(requestItem: RequestQueueItem): void;
    private process;
    clear(): void;
    get length(): number;
    get isActive(): boolean;
}
