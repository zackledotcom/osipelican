import { EventEmitter } from 'events';
import { ErrorHandler, ServiceError, ErrorSeverity } from '../utils/errors';
import { logger as defaultLogger } from '../utils/logger';

export enum ServiceStatus {
  STOPPED = 'stopped',
  STARTING = 'starting',
  RUNNING = 'running',
  ERROR = 'error',
  STOPPING = 'stopping'
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

export abstract class BaseService extends EventEmitter implements Service {
  public status: ServiceStatus = ServiceStatus.STOPPED;
  public metrics: ServiceMetrics = {
    uptime: 0,
    memoryUsage: 0,
    cpuUsage: 0,
    restartCount: 0
  };
  public readonly config: ServiceConfig;
  public readonly logger: typeof defaultLogger;
  protected startTime: number = 0;
  protected errorHandler: ErrorHandler;
  protected restartAttempts: number = 0;
  protected healthCheckInterval?: NodeJS.Timeout;

  constructor(
    config: ServiceConfig,
    logger = defaultLogger
  ) {
    super();
    this.config = config;
    this.logger = logger;
    this.errorHandler = ErrorHandler.getInstance();
  }

  public get name(): string {
    return this.config.name;
  }

  public get currentStatus(): ServiceStatus {
    return this.status;
  }

  public get currentMetrics(): ServiceMetrics {
    return this.metrics;
  }

  public async start(): Promise<void> {
    if (this.status === ServiceStatus.RUNNING) {
      return;
    }

    try {
      this.status = ServiceStatus.STARTING;
      this.emit('status', this.status);
      
      await this.validateDependencies();
      await this.initialize();
      
      this.status = ServiceStatus.RUNNING;
      this.startTime = Date.now();
      this.restartAttempts = 0;
      
      this.emit('status', this.status);
      this.startHealthCheck();
      
      this.logger.info(`Service ${this.name} started successfully`);
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  public async stop(): Promise<void> {
    if (this.status === ServiceStatus.STOPPED) {
      return;
    }

    try {
      this.status = ServiceStatus.STOPPING;
      this.emit('status', this.status);
      
      this.stopHealthCheck();
      await this.cleanup();
      
      this.status = ServiceStatus.STOPPED;
      this.emit('status', this.status);
      
      this.logger.info(`Service ${this.name} stopped successfully`);
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  public async restart(): Promise<void> {
    await this.stop();
    await this.start();
  }

  public async getStatus(): Promise<ServiceStatus> {
    return this.status;
  }

  public async getMetrics(): Promise<ServiceMetrics> {
    const currentTime = Date.now();
    this.metrics.uptime = this.startTime ? currentTime - this.startTime : 0;
    
    const processMetrics = process.memoryUsage();
    this.metrics.memoryUsage = processMetrics.heapUsed;
    
    return this.metrics;
  }

  public async isHealthy(): Promise<boolean> {
    try {
      return await this.checkHealth();
    } catch (error) {
      this.handleError(error);
      return false;
    }
  }

  protected abstract initialize(): Promise<void>;
  protected abstract cleanup(): Promise<void>;
  protected abstract checkHealth(): Promise<boolean>;

  protected async validateDependencies(): Promise<void> {
    if (!this.config.dependencies?.length) {
      return;
    }

    for (const dep of this.config.dependencies) {
      // This will be implemented by ServiceManager
      // to check if dependent services are running
    }
  }

  protected handleError(error: unknown): void {
    const serviceError = new ServiceError(
      error instanceof Error ? error.message : 'Unknown error',
      ErrorSeverity.HIGH,
      { serviceName: this.name }
    );

    this.errorHandler.handleError(serviceError);
    this.metrics.lastError = serviceError;
    this.emit('error', serviceError);

    if (this.config.restartOnCrash && 
        this.restartAttempts < (this.config.maxRestarts || 3)) {
      this.restartAttempts++;
      setTimeout(() => this.restart(), this.config.restartDelay || 5000);
    }
  }

  private startHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(async () => {
      const isHealthy = await this.isHealthy();
      if (!isHealthy) {
        this.handleError(new Error('Health check failed'));
      }
    }, 30000); // Check every 30 seconds
  }

  private stopHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }
  }
} 