import { EventEmitter } from 'events';
import { ErrorHandler } from '../utils/errors';
import { logger as defaultLogger } from '../utils/logger';
export declare enum ServiceStatus {
    STOPPED = "stopped",
    STARTING = "starting",
    RUNNING = "running",
    ERROR = "error",
    STOPPING = "stopping"
}
export interface ServiceConfig {
    name: string;
    autoStart?: boolean;
    restartOnCrash?: boolean;
    maxRestarts?: number;
    restartDelay?: number;
    environment?: string[];
    dependencies?: string[];
    config?: Record<string, any>;
}
export interface ServiceMetrics {
    uptime: number;
    memoryUsage: number;
    cpuUsage: number;
    lastError?: Error;
    restartCount: number;
}
export interface ServiceEvents {
    status: (status: ServiceStatus) => void;
    error: (error: Error) => void;
    metrics: (metrics: ServiceMetrics) => void;
    log: (message: string, level: string) => void;
}
export interface Service extends EventEmitter {
    readonly name: string;
    readonly status: ServiceStatus;
    readonly metrics: ServiceMetrics;
    readonly config: ServiceConfig;
    start(): Promise<void>;
    stop(): Promise<void>;
    restart(): Promise<void>;
    getStatus(): Promise<ServiceStatus>;
    getMetrics(): Promise<ServiceMetrics>;
    isHealthy(): Promise<boolean>;
}
export declare abstract class BaseService extends EventEmitter implements Service {
    status: ServiceStatus;
    metrics: ServiceMetrics;
    readonly config: ServiceConfig;
    readonly logger: typeof defaultLogger;
    protected startTime: number;
    protected errorHandler: ErrorHandler;
    protected restartAttempts: number;
    protected healthCheckInterval?: NodeJS.Timeout;
    constructor(config: ServiceConfig, logger?: import("../utils/logger").Logger);
    get name(): string;
    get currentStatus(): ServiceStatus;
    get currentMetrics(): ServiceMetrics;
    start(): Promise<void>;
    stop(): Promise<void>;
    restart(): Promise<void>;
    getStatus(): Promise<ServiceStatus>;
    getMetrics(): Promise<ServiceMetrics>;
    isHealthy(): Promise<boolean>;
    protected abstract initialize(): Promise<void>;
    protected abstract cleanup(): Promise<void>;
    protected abstract checkHealth(): Promise<boolean>;
    protected validateDependencies(): Promise<void>;
    protected handleError(error: unknown): void;
    private startHealthCheck;
    private stopHealthCheck;
}
