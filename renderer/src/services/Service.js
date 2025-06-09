"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseService = exports.ServiceStatus = void 0;
const events_1 = require("events");
const errors_1 = require("../utils/errors");
const logger_1 = require("../utils/logger");
var ServiceStatus;
(function (ServiceStatus) {
    ServiceStatus["STOPPED"] = "stopped";
    ServiceStatus["STARTING"] = "starting";
    ServiceStatus["RUNNING"] = "running";
    ServiceStatus["ERROR"] = "error";
    ServiceStatus["STOPPING"] = "stopping";
})(ServiceStatus || (exports.ServiceStatus = ServiceStatus = {}));
class BaseService extends events_1.EventEmitter {
    constructor(config, logger = logger_1.logger) {
        super();
        this.status = ServiceStatus.STOPPED;
        this.metrics = {
            uptime: 0,
            memoryUsage: 0,
            cpuUsage: 0,
            restartCount: 0
        };
        this.startTime = 0;
        this.restartAttempts = 0;
        this.config = config;
        this.logger = logger;
        this.errorHandler = errors_1.ErrorHandler.getInstance();
    }
    get name() {
        return this.config.name;
    }
    get currentStatus() {
        return this.status;
    }
    get currentMetrics() {
        return this.metrics;
    }
    async start() {
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
        }
        catch (error) {
            this.handleError(error);
            throw error;
        }
    }
    async stop() {
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
        }
        catch (error) {
            this.handleError(error);
            throw error;
        }
    }
    async restart() {
        await this.stop();
        await this.start();
    }
    async getStatus() {
        return this.status;
    }
    async getMetrics() {
        const currentTime = Date.now();
        this.metrics.uptime = this.startTime ? currentTime - this.startTime : 0;
        const processMetrics = process.memoryUsage();
        this.metrics.memoryUsage = processMetrics.heapUsed;
        return this.metrics;
    }
    async isHealthy() {
        try {
            return await this.checkHealth();
        }
        catch (error) {
            this.handleError(error);
            return false;
        }
    }
    async validateDependencies() {
        if (!this.config.dependencies?.length) {
            return;
        }
        for (const dep of this.config.dependencies) {
            // This will be implemented by ServiceManager
            // to check if dependent services are running
        }
    }
    handleError(error) {
        const serviceError = new errors_1.ServiceError(error instanceof Error ? error.message : 'Unknown error', errors_1.ErrorSeverity.HIGH, { serviceName: this.name });
        this.errorHandler.handleError(serviceError);
        this.metrics.lastError = serviceError;
        this.emit('error', serviceError);
        if (this.config.restartOnCrash &&
            this.restartAttempts < (this.config.maxRestarts || 3)) {
            this.restartAttempts++;
            setTimeout(() => this.restart(), this.config.restartDelay || 5000);
        }
    }
    startHealthCheck() {
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
    stopHealthCheck() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = undefined;
        }
    }
}
exports.BaseService = BaseService;
//# sourceMappingURL=Service.js.map