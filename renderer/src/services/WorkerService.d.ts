import { BaseService, ServiceConfig } from './Service';
export interface Task {
    id: string;
    type: string;
    data: any;
    priority: number;
    retryCount?: number;
    workerId?: number;
}
export interface WorkerConfig extends ServiceConfig {
    maxWorkers: number;
    taskQueueSize: number;
    workerTimeout: number;
    retryAttempts: number;
    workerScript: string;
}
export declare class WorkerService extends BaseService {
    private workers;
    private taskQueue;
    private activeTasks;
    private config;
    constructor(config: WorkerConfig);
    protected initialize(): Promise<void>;
    protected cleanup(): Promise<void>;
    protected checkHealth(): Promise<boolean>;
    submitTask(task: Omit<Task, 'id'>): Promise<string>;
    private processNextTask;
    private handleWorkerMessage;
    private handleWorkerError;
    private handleWorkerExit;
    private handleTaskTimeout;
    getMetrics(): Promise<any>;
}
