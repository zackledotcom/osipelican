import { BaseService, ServiceConfig } from './Service';
export interface RAGTask {
    id: string;
    type: 'embed' | 'search' | 'chunk' | 'process';
    data: any;
    priority: number;
}
export interface RAGWorkerConfig extends ServiceConfig {
    maxWorkers: number;
    taskQueueSize: number;
    workerTimeout: number;
    retryAttempts: number;
}
export declare class RAGWorker extends BaseService {
    private workers;
    private taskQueue;
    private activeTasks;
    private config;
    constructor(config: RAGWorkerConfig);
    protected initialize(): Promise<void>;
    protected cleanup(): Promise<void>;
    protected checkHealth(): Promise<boolean>;
    submitTask(task: RAGTask): Promise<string>;
    private processNextTask;
    private handleWorkerMessage;
    private handleWorkerError;
    private handleWorkerExit;
    private handleTaskTimeout;
    getMetrics(): Promise<any>;
}
