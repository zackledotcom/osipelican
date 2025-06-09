"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceManager = void 0;
const events_1 = require("events");
const Service_1 = require("./Service");
const errors_1 = require("../utils/errors");
const logger_1 = require("../utils/logger");
const OllamaService_1 = require("./OllamaService");
class ServiceManager extends events_1.EventEmitter {
    constructor() {
        super();
        this.services = new Map();
        this.serviceConfigs = new Map();
        this.errorHandler = errors_1.ErrorHandler.getInstance();
        this.environment = process.env.NODE_ENV || 'development';
        this.setupServiceRegistry();
    }
    static getInstance() {
        if (!ServiceManager.instance) {
            ServiceManager.instance = new ServiceManager();
        }
        return ServiceManager.instance;
    }
    setupServiceRegistry() {
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
    registerServiceConfig(config) {
        this.serviceConfigs.set(config.name, config);
    }
    async initialize() {
        try {
            // Start metrics collection
            this.startMetricsCollection();
            // Initialize services based on environment and dependencies
            const servicesToStart = this.getServicesToStart();
            // Start services in parallel if they have no dependencies
            const independentServices = servicesToStart.filter(service => !this.serviceConfigs.get(service)?.dependencies?.length);
            await Promise.all(independentServices.map(service => this.startService(service)));
            // Start dependent services sequentially
            const dependentServices = servicesToStart.filter(service => this.serviceConfigs.get(service)?.dependencies?.length);
            for (const service of dependentServices) {
                await this.startService(service);
            }
            logger_1.logger.info('ServiceManager initialized successfully');
        }
        catch (error) {
            this.errorHandler.handleError(new errors_1.ServiceError('Failed to initialize services', errors_1.ErrorSeverity.CRITICAL, { error: error instanceof Error ? error.message : 'Unknown error' }));
            throw error;
        }
    }
    getServicesToStart() {
        return Array.from(this.serviceConfigs.entries())
            .filter(([_, config]) => config.autoStart &&
            (!config.environment || config.environment.includes(this.environment)))
            .map(([name]) => name);
    }
    async startService(serviceName) {
        try {
            const config = this.serviceConfigs.get(serviceName);
            if (!config) {
                throw new Error(`Service configuration not found for ${serviceName}`);
            }
            // Check dependencies
            if (config.dependencies?.length) {
                for (const dep of config.dependencies) {
                    const depService = this.services.get(dep);
                    if (!depService || depService.status !== Service_1.ServiceStatus.RUNNING) {
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
            logger_1.logger.info(`Service ${serviceName} started successfully`);
        }
        catch (error) {
            this.errorHandler.handleError(new errors_1.ServiceError(error instanceof Error ? error.message : 'Service start failed', errors_1.ErrorSeverity.HIGH, { serviceName }));
            throw error;
        }
    }
    async createService(name, config) {
        switch (name) {
            case 'ollama':
                return new OllamaService_1.OllamaService(config);
            case 'vectordb':
                // Import dynamically to avoid circular dependencies
                const { VectorDBService } = await Promise.resolve().then(() => __importStar(require('./VectorDBService')));
                return new VectorDBService(config);
            case 'express':
                // Import dynamically to avoid circular dependencies
                const { ExpressService } = await Promise.resolve().then(() => __importStar(require('./ExpressService')));
                return new ExpressService(config);
            default:
                throw new Error(`Unknown service type: ${name}`);
        }
    }
    setupServiceEventListeners(service) {
        service.on('status', (status) => {
            this.emit('service:status', service.name, status);
        });
        service.on('error', (error) => {
            this.emit('service:error', service.name, error);
        });
        service.on('metrics', (metrics) => {
            this.emit('service:metrics', service.name, metrics);
        });
        service.on('log', (message, level) => {
            this.emit('service:log', service.name, message, level);
        });
    }
    async stopService(serviceName) {
        const service = this.services.get(serviceName);
        if (!service) {
            throw new Error(`Service ${serviceName} not found`);
        }
        try {
            await service.stop();
            this.services.delete(serviceName);
            logger_1.logger.info(`Service ${serviceName} stopped successfully`);
        }
        catch (error) {
            this.errorHandler.handleError(new errors_1.ServiceError(error instanceof Error ? error.message : 'Service stop failed', errors_1.ErrorSeverity.HIGH, { serviceName }));
            throw error;
        }
    }
    async restartService(serviceName) {
        try {
            await this.stopService(serviceName);
            await this.startService(serviceName);
            logger_1.logger.info(`Service ${serviceName} restarted successfully`);
        }
        catch (error) {
            this.errorHandler.handleError(new errors_1.ServiceError(error instanceof Error ? error.message : 'Service restart failed', errors_1.ErrorSeverity.HIGH, { serviceName }));
            throw error;
        }
    }
    getService(serviceName) {
        return this.services.get(serviceName);
    }
    getServiceStatus(serviceName) {
        return this.services.get(serviceName)?.status;
    }
    getAllServiceStatus() {
        const statusMap = new Map();
        for (const [name, service] of this.services.entries()) {
            statusMap.set(name, service.status);
        }
        return statusMap;
    }
    async cleanup() {
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
            logger_1.logger.info('ServiceManager cleaned up successfully');
        }
        catch (error) {
            this.errorHandler.handleError(new errors_1.ServiceError(error instanceof Error ? error.message : 'ServiceManager cleanup failed', errors_1.ErrorSeverity.CRITICAL, { error: error instanceof Error ? error.message : 'Unknown error' }));
            throw error;
        }
    }
    buildServiceGraph() {
        const graph = new Map();
        for (const [name, config] of this.serviceConfigs.entries()) {
            graph.set(name, new Set(config.dependencies || []));
        }
        return graph;
    }
    getServiceStopOrder(graph) {
        const visited = new Set();
        const order = [];
        const visit = (service) => {
            if (visited.has(service))
                return;
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
    startMetricsCollection() {
        this.metricsInterval = setInterval(() => {
            for (const [name, service] of this.services.entries()) {
                try {
                    const metrics = service.getMetrics();
                    this.emit('service:metrics', name, metrics);
                }
                catch (error) {
                    this.errorHandler.handleError(new errors_1.ServiceError(error instanceof Error ? error.message : 'Failed to collect metrics', errors_1.ErrorSeverity.LOW, { serviceName: name }));
                }
            }
        }, 60000); // Collect metrics every minute
    }
    stopMetricsCollection() {
        if (this.metricsInterval) {
            clearInterval(this.metricsInterval);
            this.metricsInterval = undefined;
        }
    }
}
exports.ServiceManager = ServiceManager;
//# sourceMappingURL=ServiceManager.js.map