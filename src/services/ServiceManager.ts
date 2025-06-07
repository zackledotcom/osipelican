import { EventEmitter } from 'events';
import { Service, ServiceConfig, ServiceStatus, ServiceMetrics } from './Service';
import { ErrorHandler, ServiceError, ErrorSeverity } from '../utils/errors';
import { logger } from '../utils/logger';
import { OllamaService } from './OllamaService';
import type { VectorDBService } from './VectorDBService';
import type { ExpressService } from './ExpressService';

export interface ServiceManagerEvents {
  'service:status': (serviceName: string, status: ServiceStatus) => void;
  'service:error': (serviceName: string, error: Error) => void;
  'service:metrics': (serviceName: string, metrics: ServiceMetrics) => void;
  'service:log': (serviceName: string, message: string, level: string) => void;
}

export class ServiceManager extends EventEmitter {
  private static instance: ServiceManager;
  private services: Map<string, Service> = new Map();
  private serviceConfigs: Map<string, ServiceConfig> = new Map();
  private errorHandler: ErrorHandler;
  private metricsInterval?: NodeJS.Timeout;
  private environment: string;

  private constructor() {
    super();
    this.errorHandler = ErrorHandler.getInstance();
    this.environment = process.env.NODE_ENV || 'development';
    this.setupServiceRegistry();
  }

  public static getInstance(): ServiceManager {
    if (!ServiceManager.instance) {
      ServiceManager.instance = new ServiceManager();
    }
    return ServiceManager.instance;
  }

  private setupServiceRegistry(): void {
    // Register service configurations with enhanced settings
    this.registerServiceConfig({
      name: 'ollama',
      autoStart: true,
      restartOnCrash: true,
      maxRestarts: 3,
      restartDelay: 5000,
      environment: ['development', 'production'],
      dependencies: [],
      config: {
        baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
        defaultModel: process.env.OLLAMA_DEFAULT_MODEL || 'llama2',
        timeout: parseInt(process.env.OLLAMA_TIMEOUT || '30000', 10),
        maxRetries: parseInt(process.env.OLLAMA_MAX_RETRIES || '3', 10),
        retryDelay: parseInt(process.env.OLLAMA_RETRY_DELAY || '1000', 10)
      }
    });

    this.registerServiceConfig({
      name: 'vectordb',
      autoStart: true,
      restartOnCrash: true,
      maxRestarts: 3,
      restartDelay: 5000,
      environment: ['development', 'production'],
      dependencies: [],
      config: {
        dataDir: process.env.VECTOR_DB_DIR || './data/vectordb',
        maxConnections: parseInt(process.env.VECTOR_DB_MAX_CONNECTIONS || '10', 10),
        cacheSize: parseInt(process.env.VECTOR_DB_CACHE_SIZE || '1000', 10)
      }
    });

    this.registerServiceConfig({
      name: 'express',
      autoStart: true,
      restartOnCrash: true,
      maxRestarts: 3,
      restartDelay: 5000,
      environment: ['development', 'production'],
      dependencies: ['ollama', 'vectordb'],
      config: {
        port: parseInt(process.env.EXPRESS_PORT || '3000', 10),
        host: process.env.EXPRESS_HOST || 'localhost',
        cors: process.env.EXPRESS_CORS === 'true',
        rateLimit: {
          windowMs: parseInt(process.env.EXPRESS_RATE_LIMIT_WINDOW || '900000', 10),
          max: parseInt(process.env.EXPRESS_RATE_LIMIT_MAX || '100', 10)
        }
      }
    });
  }

  private registerServiceConfig(config: ServiceConfig): void {
    this.serviceConfigs.set(config.name, config);
  }

  public async initialize(): Promise<void> {
    try {
      // Start metrics collection
      this.startMetricsCollection();

      // Initialize services based on environment and dependencies
      const servicesToStart = this.getServicesToStart();
      
      // Start services in parallel if they have no dependencies
      const independentServices = servicesToStart.filter(
        service => !this.serviceConfigs.get(service)?.dependencies?.length
      );
      
      await Promise.all(
        independentServices.map(service => this.startService(service))
      );

      // Start dependent services sequentially
      const dependentServices = servicesToStart.filter(
        service => this.serviceConfigs.get(service)?.dependencies?.length
      );

      for (const service of dependentServices) {
        await this.startService(service);
      }

      logger.info('ServiceManager initialized successfully');
    } catch (error) {
      this.errorHandler.handleError(
        new ServiceError(
          'Failed to initialize services',
          ErrorSeverity.CRITICAL,
          { error: error instanceof Error ? error.message : 'Unknown error' }
        )
      );
      throw error;
    }
  }

  private getServicesToStart(): string[] {
    return Array.from(this.serviceConfigs.entries())
      .filter(([_, config]) => 
        config.autoStart && 
        (!config.environment || config.environment.includes(this.environment))
      )
      .map(([name]) => name);
  }

  private async startService(serviceName: string): Promise<void> {
    try {
      const config = this.serviceConfigs.get(serviceName);
      if (!config) {
        throw new Error(`Service configuration not found for ${serviceName}`);
      }

      // Check dependencies
      if (config.dependencies?.length) {
        for (const dep of config.dependencies) {
          const depService = this.services.get(dep);
          if (!depService || depService.status !== ServiceStatus.RUNNING) {
            throw new Error(`Dependency ${dep} not running for service ${serviceName}`);
          }
        }
      }

      // Create and start service
      const service = await this.createService(serviceName, config);
      this.services.set(serviceName, service);
      
      // Setup service event listeners
      this.setupServiceEventListeners(service);
      
      await service.start();
      
      logger.info(`Service ${serviceName} started successfully`);
    } catch (error) {
      this.errorHandler.handleError(
        new ServiceError(
          error instanceof Error ? error.message : 'Service start failed',
          ErrorSeverity.HIGH,
          { serviceName }
        )
      );
      throw error;
    }
  }

  private async createService(name: string, config: ServiceConfig): Promise<Service> {
    switch (name) {
      case 'ollama':
        return new OllamaService(config);
      case 'vectordb':
        // Import dynamically to avoid circular dependencies
        const { VectorDBService } = await import('./VectorDBService');
        return new VectorDBService(config);
      case 'express':
        // Import dynamically to avoid circular dependencies
        const { ExpressService } = await import('./ExpressService');
        return new ExpressService(config);
      default:
        throw new Error(`Unknown service type: ${name}`);
    }
  }

  private setupServiceEventListeners(service: Service): void {
    service.on('status', (status: ServiceStatus) => {
      this.emit('service:status', service.name, status);
    });

    service.on('error', (error: Error) => {
      this.emit('service:error', service.name, error);
    });

    service.on('metrics', (metrics: ServiceMetrics) => {
      this.emit('service:metrics', service.name, metrics);
    });

    service.on('log', (message: string, level: string) => {
      this.emit('service:log', service.name, message, level);
    });
  }

  public async stopService(serviceName: string): Promise<void> {
    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(`Service ${serviceName} not found`);
    }

    try {
      await service.stop();
      this.services.delete(serviceName);
      logger.info(`Service ${serviceName} stopped successfully`);
    } catch (error) {
      this.errorHandler.handleError(
        new ServiceError(
          error instanceof Error ? error.message : 'Service stop failed',
          ErrorSeverity.HIGH,
          { serviceName }
        )
      );
      throw error;
    }
  }

  public async restartService(serviceName: string): Promise<void> {
    try {
      await this.stopService(serviceName);
      await this.startService(serviceName);
      logger.info(`Service ${serviceName} restarted successfully`);
    } catch (error) {
      this.errorHandler.handleError(
        new ServiceError(
          error instanceof Error ? error.message : 'Service restart failed',
          ErrorSeverity.HIGH,
          { serviceName }
        )
      );
      throw error;
    }
  }

  public getService<T extends Service>(serviceName: string): T | undefined {
    return this.services.get(serviceName) as T | undefined;
  }

  public getServiceStatus(serviceName: string): ServiceStatus | undefined {
    return this.services.get(serviceName)?.status;
  }

  public getAllServiceStatus(): Map<string, ServiceStatus> {
    const statusMap = new Map<string, ServiceStatus>();
    for (const [name, service] of this.services.entries()) {
      statusMap.set(name, service.status);
    }
    return statusMap;
  }

  public async cleanup(): Promise<void> {
    try {
      // Stop metrics collection
      this.stopMetricsCollection();

      // Get services in correct stop order
      const graph = this.buildServiceGraph();
      const stopOrder = this.getServiceStopOrder(graph);

      // Stop services in reverse dependency order
      for (const serviceName of stopOrder) {
        await this.stopService(serviceName);
      }

      logger.info('ServiceManager cleaned up successfully');
    } catch (error) {
      this.errorHandler.handleError(
        new ServiceError(
          error instanceof Error ? error.message : 'ServiceManager cleanup failed',
          ErrorSeverity.CRITICAL,
          { error: error instanceof Error ? error.message : 'Unknown error' }
        )
      );
      throw error;
    }
  }

  private buildServiceGraph(): Map<string, Set<string>> {
    const graph = new Map<string, Set<string>>();
    for (const [name, config] of this.serviceConfigs.entries()) {
      graph.set(name, new Set(config.dependencies || []));
    }
    return graph;
  }

  private getServiceStopOrder(graph: Map<string, Set<string>>): string[] {
    const visited = new Set<string>();
    const order: string[] = [];

    const visit = (service: string) => {
      if (visited.has(service)) return;
      visited.add(service);

      const dependencies = graph.get(service) || new Set();
      for (const dep of dependencies) {
        visit(dep);
      }

      order.push(service);
    };

    for (const service of graph.keys()) {
      visit(service);
    }

    return order;
  }

  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(() => {
      for (const [name, service] of this.services.entries()) {
        try {
          const metrics = service.getMetrics();
          this.emit('service:metrics', name, metrics);
        } catch (error) {
          this.errorHandler.handleError(
            new ServiceError(
              error instanceof Error ? error.message : 'Failed to collect metrics',
              ErrorSeverity.LOW,
              { serviceName: name }
            )
          );
        }
      }
    }, 60000); // Collect metrics every minute
  }

  private stopMetricsCollection(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = undefined;
    }
  }
} 