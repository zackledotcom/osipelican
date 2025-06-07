export declare enum ErrorSeverity {
    LOW = "low",
    MEDIUM = "medium",
    HIGH = "high",
    CRITICAL = "critical"
}
export declare enum ErrorCategory {
    WINDOW = "window",
    SERVICE = "service",
    IPC = "ipc",
    RENDERER = "renderer",
    SYSTEM = "system",
    NETWORK = "network",
    DATABASE = "database"
}
export interface ErrorContext {
    category: ErrorCategory;
    severity: ErrorSeverity;
    recoverable: boolean;
    timestamp: string;
    details?: Record<string, any>;
}
export declare class AppError extends Error {
    readonly context: ErrorContext;
    constructor(message: string, category: ErrorCategory, severity?: ErrorSeverity, recoverable?: boolean, details?: Record<string, any>);
}
export declare class WindowError extends AppError {
    constructor(message: string, severity?: ErrorSeverity, details?: Record<string, any>);
}
export declare class ServiceError extends AppError {
    constructor(message: string, severity?: ErrorSeverity, details?: Record<string, any>);
}
export declare class IPCError extends AppError {
    constructor(message: string, severity?: ErrorSeverity, details?: Record<string, any>);
}
export declare class ErrorHandler {
    private static instance;
    private errorCount;
    private readonly MAX_RETRIES;
    private readonly RETRY_DELAY;
    private constructor();
    static getInstance(): ErrorHandler;
    private initializeErrorCounts;
    handleError(error: Error | AppError): void;
    private normalizeError;
    private logError;
    private updateErrorCount;
    private attemptRecovery;
    private recoverWindow;
    private recoverService;
    private recoverIPC;
    private recoverRenderer;
    resetErrorCount(category: ErrorCategory): void;
    getErrorCount(category: ErrorCategory): number;
}
