import { Worker } from 'worker_threads';
import { BaseService, ServiceConfig } from './Service';
import { logger } from '../utils/logger';
import path from 'path';
import { app } from 'electron';
import { v4 as uuidv4 } from 'uuid';

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

export class WorkerService extends BaseService {
  private workers: Worker[] = [];
  private taskQueue: Task[] = [];
  private activeTasks: Map<string, Task> = new Map();
  private config: WorkerConfig;

  constructor(config: WorkerConfig) {
    super(config);
    this.config = {
      maxWorkers: 4,
      taskQueueSize: 100,
      workerTimeout: 30000,
      retryAttempts: 3,
      ...config
    };
  }

  protected async initialize(): Promise<void> {
    try {
      // Initialize worker pool
      for (let i = 0; i < this.config.maxWorkers; i++) {
        const worker = new Worker(
          path.join(__dirname, 'workers', this.config.workerScript),
          {
            workerData: {
              workerId: i,
              config: this.config
            }
          }
        );

        worker.on('message', this.handleWorkerMessage.bind(this));
        worker.on('error', this.handleWorkerError.bind(this));
        worker.on('exit', this.handleWorkerExit.bind(this));

        this.workers.push(worker);
      }

      this.logger.info(`WorkerService initialized with ${this.config.maxWorkers} workers`);
    } catch (error) {
      this.logger.error('Failed to initialize WorkerService:', error);
      throw error;
    }
  }

  protected async cleanup(): Promise<void> {
    try {
      // Terminate all workers
      await Promise.all(
        this.workers.map(worker => worker.terminate())
      );
      this.workers = [];
      this.taskQueue = [];
      this.activeTasks.clear();
    } catch (error) {
      this.logger.error('Error cleaning up WorkerService:', error);
      throw error;
    }
  }

  protected async checkHealth(): Promise<boolean> {
    try {
      // Check if workers are responsive
      const healthChecks = this.workers.map(worker => 
        new Promise<boolean>((resolve) => {
          const timeout = setTimeout(() => resolve(false), 5000);
          worker.postMessage({ type: 'health_check' });
          worker.once('message', (msg) => {
            if (msg.type === 'health_check_response') {
              clearTimeout(timeout);
              resolve(true);
            }
          });
        })
      );

      const results = await Promise.all(healthChecks);
      return results.every(healthy => healthy);
    } catch (error) {
      this.logger.error('Health check failed:', error);
      return false;
    }
  }

  public async submitTask(task: Omit<Task, 'id'>): Promise<string> {
    if (this.taskQueue.length >= this.config.taskQueueSize) {
      throw new Error('Task queue is full');
    }

    const taskWithId = {
      ...task,
      id: uuidv4()
    };

    this.taskQueue.push(taskWithId);
    this.processNextTask();
    return taskWithId.id;
  }

  private async processNextTask(): Promise<void> {
    if (this.taskQueue.length === 0) return;

    const availableWorker = this.workers.find(worker => 
      !Array.from(this.activeTasks.values()).some(task => 
        task.workerId === worker.threadId
      )
    );

    if (!availableWorker) return;

    const task = this.taskQueue.shift()!;
    this.activeTasks.set(task.id, { ...task, workerId: availableWorker.threadId });

    availableWorker.postMessage({
      type: 'task',
      task
    });

    // Set timeout for task
    setTimeout(() => {
      if (this.activeTasks.has(task.id)) {
        this.handleTaskTimeout(task.id);
      }
    }, this.config.workerTimeout);
  }

  private handleWorkerMessage(message: any): void {
    if (message.type === 'task_complete') {
      const task = this.activeTasks.get(message.taskId);
      if (task) {
        this.activeTasks.delete(message.taskId);
        this.emit('taskComplete', {
          taskId: message.taskId,
          result: message.result
        });
        this.processNextTask();
      }
    }
  }

  private handleWorkerError(error: Error): void {
    this.logger.error('Worker error:', error);
    this.emit('workerError', error);
  }

  private handleWorkerExit(code: number): void {
    this.logger.warn(`Worker exited with code ${code}`);
    this.emit('workerExit', code);
  }

  private handleTaskTimeout(taskId: string): void {
    const task = this.activeTasks.get(taskId);
    if (task) {
      this.activeTasks.delete(taskId);
      this.emit('taskTimeout', taskId);
      
      if ((task.retryCount || 0) < this.config.retryAttempts) {
        this.taskQueue.push({
          ...task,
          retryCount: (task.retryCount || 0) + 1
        });
        this.processNextTask();
      }
    }
  }

  public getMetrics(): Promise<any> {
    return Promise.resolve({
      activeTasks: this.activeTasks.size,
      queuedTasks: this.taskQueue.length,
      workerCount: this.workers.length
    });
  }
} 