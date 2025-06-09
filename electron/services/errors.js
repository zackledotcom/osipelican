"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorHandler = exports.IPCError = exports.ServiceError = exports.WindowError = exports.AppError = exports.ErrorCategory = exports.ErrorSeverity = void 0;
const logger_1 = require("../utils/logger");
var ErrorSeverity;
(function (ErrorSeverity) {
    ErrorSeverity["LOW"] = "low";
    ErrorSeverity["MEDIUM"] = "medium";
    ErrorSeverity["HIGH"] = "high";
    ErrorSeverity["CRITICAL"] = "critical";
})(ErrorSeverity || (exports.ErrorSeverity = ErrorSeverity = {}));
var ErrorCategory;
(function (ErrorCategory) {
    ErrorCategory["WINDOW"] = "window";
    ErrorCategory["SERVICE"] = "service";
    ErrorCategory["IPC"] = "ipc";
    ErrorCategory["RENDERER"] = "renderer";
    ErrorCategory["SYSTEM"] = "system";
    ErrorCategory["NETWORK"] = "network";
    ErrorCategory["DATABASE"] = "database";
})(ErrorCategory || (exports.ErrorCategory = ErrorCategory = {}));
class AppError extends Error {
    constructor(message, category, severity = ErrorSeverity.MEDIUM, recoverable = true, details) {
        super(message);
        this.name = 'AppError';
        this.context = {
            category,
            severity,
            recoverable,
            timestamp: new Date().toISOString(),
            details
        };
    }
}
exports.AppError = AppError;
class WindowError extends AppError {
    constructor(message, severity = ErrorSeverity.MEDIUM, details) {
        super(message, ErrorCategory.WINDOW, severity, true, details);
        this.name = 'WindowError';
    }
}
exports.WindowError = WindowError;
class ServiceError extends AppError {
    constructor(message, severity = ErrorSeverity.MEDIUM, details) {
        super(message, ErrorCategory.SERVICE, severity, true, details);
        this.name = 'ServiceError';
    }
}
exports.ServiceError = ServiceError;
class IPCError extends AppError {
    constructor(message, severity = ErrorSeverity.MEDIUM, details) {
        super(message, ErrorCategory.IPC, severity, true, details);
        this.name = 'IPCError';
    }
}
exports.IPCError = IPCError;
class ErrorHandler {
    constructor() {
        this.errorCount = new Map();
        this.MAX_RETRIES = 3;
        this.RETRY_DELAY = 5000; // 5 seconds
        this.initializeErrorCounts();
    }
    static getInstance() {
        if (!ErrorHandler.instance) {
            ErrorHandler.instance = new ErrorHandler();
        }
        return ErrorHandler.instance;
    }
    initializeErrorCounts() {
        Object.values(ErrorCategory).forEach(category => {
            this.errorCount.set(category, 0);
        });
    }
    handleError(error) {
        const appError = this.normalizeError(error);
        this.logError(appError);
        this.updateErrorCount(appError.context.category);
        this.attemptRecovery(appError);
    }
    normalizeError(error) {
        if (error instanceof AppError) {
            return error;
        }
        // Convert generic errors to AppError
        return new AppError(error.message, ErrorCategory.SYSTEM, ErrorSeverity.MEDIUM, true, { originalError: error });
    }
    logError(error) {
        const { category, severity, timestamp, details } = error.context;
        const errorCount = this.errorCount.get(category) || 0;
        logger_1.logger.error(`[${severity.toUpperCase()}] ${error.name}: ${error.message}`, {
            category,
            timestamp,
            errorCount,
            details,
            stack: error.stack
        });
    }
    updateErrorCount(category) {
        const currentCount = this.errorCount.get(category) || 0;
        this.errorCount.set(category, currentCount + 1);
    }
    async attemptRecovery(error) {
        if (!error.context.recoverable) {
            logger_1.logger.error('Non-recoverable error encountered:', error);
            return;
        }
        const errorCount = this.errorCount.get(error.context.category) || 0;
        if (errorCount > this.MAX_RETRIES) {
            logger_1.logger.error(`Maximum retry attempts (${this.MAX_RETRIES}) exceeded for ${error.context.category}`);
            return;
        }
        try {
            switch (error.context.category) {
                case ErrorCategory.WINDOW:
                    await this.recoverWindow();
                    break;
                case ErrorCategory.SERVICE:
                    await this.recoverService(error);
                    break;
                case ErrorCategory.IPC:
                    await this.recoverIPC();
                    break;
                case ErrorCategory.RENDERER:
                    await this.recoverRenderer();
                    break;
                default:
                    logger_1.logger.warn(`No specific recovery strategy for ${error.context.category}`);
            }
        }
        catch (recoveryError) {
            logger_1.logger.error('Recovery attempt failed:', recoveryError);
        }
    }
    async recoverWindow() {
        logger_1.logger.info('Attempting window recovery...');
        // Window recovery logic will be implemented in WindowManager
    }
    async recoverService(error) {
        logger_1.logger.info('Attempting service recovery...');
        // Service recovery logic will be implemented in ServiceManager
    }
    async recoverIPC() {
        logger_1.logger.info('Attempting IPC recovery...');
        // IPC recovery logic will be implemented in IPC handlers
    }
    async recoverRenderer() {
        logger_1.logger.info('Attempting renderer recovery...');
        // Renderer recovery logic will be implemented in WindowManager
    }
    resetErrorCount(category) {
        this.errorCount.set(category, 0);
    }
    getErrorCount(category) {
        return this.errorCount.get(category) || 0;
    }
}
exports.ErrorHandler = ErrorHandler; 