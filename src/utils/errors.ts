import { logger } from './logger';

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ErrorCategory {
  WINDOW = 'window',
  SERVICE = 'service',
  IPC = 'ipc',
  RENDERER = 'renderer',
  SYSTEM = 'system',
  NETWORK = 'network',
  DATABASE = 'database'
}

export interface ErrorContext {
  category: ErrorCategory;
  severity: ErrorSeverity;
  recoverable: boolean;
  timestamp: string;
  details?: Record<string, any>;
}

export class AppError extends Error {
  public readonly context: ErrorContext;

  constructor(
    message: string,
    category: ErrorCategory,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    recoverable: boolean = true,
    details?: Record<string, any>
  ) {
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

export class WindowError extends AppError {
  constructor(message: string, severity: ErrorSeverity = ErrorSeverity.MEDIUM, details?: Record<string, any>) {
    super(message, ErrorCategory.WINDOW, severity, true, details);
    this.name = 'WindowError';
  }
}

export class ServiceError extends AppError {
  constructor(message: string, severity: ErrorSeverity = ErrorSeverity.MEDIUM, details?: Record<string, any>) {
    super(message, ErrorCategory.SERVICE, severity, true, details);
    this.name = 'ServiceError';
  }
}

export class IPCError extends AppError {
  constructor(message: string, severity: ErrorSeverity = ErrorSeverity.MEDIUM, details?: Record<string, any>) {
    super(message, ErrorCategory.IPC, severity, true, details);
    this.name = 'IPCError';
  }
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorCount: Map<ErrorCategory, number> = new Map();
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 5000; // 5 seconds

  private constructor() {
    this.initializeErrorCounts();
  }

  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  private initializeErrorCounts(): void {
    Object.values(ErrorCategory).forEach(category => {
      this.errorCount.set(category, 0);
    });
  }

  public handleError(error: Error | AppError): void {
    const appError = this.normalizeError(error);
    this.logError(appError);
    this.updateErrorCount(appError.context.category);
    this.attemptRecovery(appError);
  }

  private normalizeError(error: Error | AppError): AppError {
    if (error instanceof AppError) {
      return error;
    }

    // Convert generic errors to AppError
    return new AppError(
      error.message,
      ErrorCategory.SYSTEM,
      ErrorSeverity.MEDIUM,
      true,
      { originalError: error }
    );
  }

  private logError(error: AppError): void {
    const { category, severity, timestamp, details } = error.context;
    const errorCount = this.errorCount.get(category) || 0;

    logger.error(`[${severity.toUpperCase()}] ${error.name}: ${error.message}`, {
      category,
      timestamp,
      errorCount,
      details,
      stack: error.stack
    });
  }

  private updateErrorCount(category: ErrorCategory): void {
    const currentCount = this.errorCount.get(category) || 0;
    this.errorCount.set(category, currentCount + 1);
  }

  private async attemptRecovery(error: AppError): Promise<void> {
    if (!error.context.recoverable) {
      logger.error('Non-recoverable error encountered:', error);
      return;
    }

    const errorCount = this.errorCount.get(error.context.category) || 0;
    if (errorCount > this.MAX_RETRIES) {
      logger.error(`Maximum retry attempts (${this.MAX_RETRIES}) exceeded for ${error.context.category}`);
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
          logger.warn(`No specific recovery strategy for ${error.context.category}`);
      }
    } catch (recoveryError) {
      logger.error('Recovery attempt failed:', recoveryError);
    }
  }

  private async recoverWindow(): Promise<void> {
    logger.info('Attempting window recovery...');
    // Window recovery logic will be implemented in WindowManager
  }

  private async recoverService(error: AppError): Promise<void> {
    logger.info('Attempting service recovery...');
    // Service recovery logic will be implemented in ServiceManager
  }

  private async recoverIPC(): Promise<void> {
    logger.info('Attempting IPC recovery...');
    // IPC recovery logic will be implemented in IPC handlers
  }

  private async recoverRenderer(): Promise<void> {
    logger.info('Attempting renderer recovery...');
    // Renderer recovery logic will be implemented in WindowManager
  }

  public resetErrorCount(category: ErrorCategory): void {
    this.errorCount.set(category, 0);
  }

  public getErrorCount(category: ErrorCategory): number {
    return this.errorCount.get(category) || 0;
  }
} 