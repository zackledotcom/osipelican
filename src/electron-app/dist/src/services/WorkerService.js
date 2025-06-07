"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkerService = void 0;
const worker_threads_1 = require("worker_threads");
const Service_1 = require("./Service");
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
class WorkerService extends Service_1.BaseService {
    constructor(config) {
        super(config);
        this.workers = [];
        this.taskQueue = [];
        this.activeTasks = new Map();
        this.config = {
            maxWorkers: 4,
            taskQueueSize: 100,
            workerTimeout: 30000,
            retryAttempts: 3,
            ...config
        };
    }
    async initialize() {
        try {
            // Initialize worker pool
            for (let i = 0; i < this.config.maxWorkers; i++) {
                const worker = new worker_threads_1.Worker(path_1.default.join(__dirname, 'workers', this.config.workerScript), {
                    workerData: {
                        workerId: i,
                        config: this.config
                    }
                });
                worker.on('message', this.handleWorkerMessage.bind(this));
                worker.on('error', this.handleWorkerError.bind(this));
                worker.on('exit', this.handleWorkerExit.bind(this));
                this.workers.push(worker);
            }
            this.logger.info(`WorkerService initialized with ${this.config.maxWorkers} workers`);
        }
        catch (error) {
            this.logger.error('Failed to initialize WorkerService:', error);
            throw error;
        }
    }
    async cleanup() {
        try {
            // Terminate all workers
            await Promise.all(this.workers.map(worker => worker.terminate()));
            this.workers = [];
            this.taskQueue = [];
            this.activeTasks.clear();
        }
        catch (error) {
            this.logger.error('Error cleaning up WorkerService:', error);
            throw error;
        }
    }
    async checkHealth() {
        try {
            // Check if workers are responsive
            const healthChecks = this.workers.map(worker => new Promise((resolve) => {
                const timeout = setTimeout(() => resolve(false), 5000);
                worker.postMessage({ type: 'health_check' });
                worker.once('message', (msg) => {
                    if (msg.type === 'health_check_response') {
                        clearTimeout(timeout);
                        resolve(true);
                    }
                });
            }));
            const results = await Promise.all(healthChecks);
            return results.every(healthy => healthy);
        }
        catch (error) {
            this.logger.error('Health check failed:', error);
            return false;
        }
    }
    async submitTask(task) {
        if (this.taskQueue.length >= this.config.taskQueueSize) {
            throw new Error('Task queue is full');
        }
        const taskWithId = {
            ...task,
            id: (0, uuid_1.v4)()
        };
        this.taskQueue.push(taskWithId);
        this.processNextTask();
        return taskWithId.id;
    }
    async processNextTask() {
        if (this.taskQueue.length === 0)
            return;
        const availableWorker = this.workers.find(worker => !Array.from(this.activeTasks.values()).some(task => task.workerId === worker.threadId));
        if (!availableWorker)
            return;
        const task = this.taskQueue.shift();
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
    handleWorkerMessage(message) {
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
    handleWorkerError(error) {
        this.logger.error('Worker error:', error);
        this.emit('workerError', error);
    }
    handleWorkerExit(code) {
        this.logger.warn(`Worker exited with code ${code}`);
        this.emit('workerExit', code);
    }
    handleTaskTimeout(taskId) {
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
    getMetrics() {
        return Promise.resolve({
            activeTasks: this.activeTasks.size,
            queuedTasks: this.taskQueue.length,
            workerCount: this.workers.length
        });
    }
}
exports.WorkerService = WorkerService;
//# sourceMappingURL=WorkerService.js.map