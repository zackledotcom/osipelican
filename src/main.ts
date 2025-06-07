import { app, BrowserWindow, ipcMain, nativeTheme } from 'electron';
import { setupIpcHandlers } from './ipc/handlers';
import { logger } from './utils/logger';
import * as path from 'path';
import { ServiceManager } from './services/ServiceManager';
import { IPC_CHANNELS } from './ipc/channels';
import './ipc/app';
import './ipc/memory';
import { OllamaService } from './services/OllamaService';
import * as fs from 'fs';
import { nativeImage } from 'electron';
import { MemoryManager } from './utils/memoryManager';
import { WindowManager } from './main/WindowManager';
import { ErrorHandler, AppError, ErrorSeverity, ErrorCategory } from './utils/errors';
import { registerOllamaHandlers } from './ipc/ollama';

// Configure V8 heap limit
const v8HeapLimit = 1024; // Reduced to 1GB for optimization
if (process.platform === 'darwin') {
  // On macOS, we need to set this before app is ready
  app.commandLine.appendSwitch('js-flags', `--max-old-space-size=${v8HeapLimit}`);
} else {
  // On other platforms, we can set it directly
  process.env.NODE_OPTIONS = `--max-old-space-size=${v8HeapLimit}`;
}

// Log the heap limit configuration
logger.info(`V8 heap limit set to ${v8HeapLimit}MB`);

// Debug: Log memory usage periodically and trigger GC
setInterval(() => {
  if (global.gc) {
    global.gc();
  }
  const used = process.memoryUsage();
  logger.debug('Memory usage:', {
    heapTotal: `${Math.round(used.heapTotal / 1024 / 1024)}MB`,
    heapUsed: `${Math.round(used.heapUsed / 1024 / 1024)}MB`,
    external: `${Math.round(used.external / 1024 / 1024)}MB`,
    rss: `${Math.round(used.rss / 1024 / 1024)}MB`,
  });
}, 30000); // Log every 30 seconds

class Application {
  private windowManager: WindowManager;
  private serviceManager: ServiceManager;
  private errorHandler: ErrorHandler;
  private memoryManager: MemoryManager;
  private isInitialized = false;
  private isQuitting = false;

  constructor() {
    this.windowManager = WindowManager.getInstance();
    this.serviceManager = ServiceManager.getInstance();
    this.errorHandler = ErrorHandler.getInstance();
    this.memoryManager = MemoryManager.getInstance();
  }

  public async start(): Promise<void> {
    try {
      // Prevent multiple instances
      const gotTheLock = app.requestSingleInstanceLock();
      if (!gotTheLock) {
        app.quit();
        return;
      }

      // Handle second instance
      app.on('second-instance', () => {
        const window = this.windowManager.getMainWindow();
        if (window) {
          if (window.isMinimized()) window.restore();
          window.focus();
        }
      });

      // Setup app events
      this.setupAppEvents();

      // Wait for app to be ready
      await new Promise<void>((resolve) => {
        if (app.isReady()) {
          resolve();
        } else {
          app.once('ready', () => resolve());
        }
      });

      // Initialize application
      await this.initialize();

    } catch (error) {
      this.errorHandler.handleError(
        new AppError(
          'Failed to start application',
          ErrorCategory.SYSTEM,
          ErrorSeverity.CRITICAL,
          true,
          { originalError: error }
        )
      );
      app.quit();
    }
  }

  private setupAppEvents(): void {
    // Handle window management
    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        this.quit();
      }
    });

    app.on('activate', () => {
      if (!this.windowManager.getMainWindow()) {
        this.initialize();
      }
    });

    // Handle theme changes
    nativeTheme.on('updated', () => {
      const window = this.windowManager.getMainWindow();
      if (window) {
        window.webContents.send(IPC_CHANNELS.APP.THEME_UPDATED, {
          theme: nativeTheme.shouldUseDarkColors ? 'dark' : 'light',
          shouldUseDarkColors: nativeTheme.shouldUseDarkColors
        });
      }
    });

    // Handle app quit
    app.on('before-quit', async (event) => {
      if (!this.isQuitting) {
        event.preventDefault();
        await this.quit();
      }
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      this.errorHandler.handleError(
        new AppError(
          'Uncaught exception',
          ErrorCategory.SYSTEM,
          ErrorSeverity.HIGH,
          true,
          { originalError: error }
        )
      );
    });

    // Handle unhandled rejections
    process.on('unhandledRejection', (reason) => {
      this.errorHandler.handleError(
        new AppError(
          'Unhandled rejection',
          ErrorCategory.SYSTEM,
          ErrorSeverity.HIGH,
          true,
          { originalError: reason }
        )
      );
    });
  }

  private async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      logger.info('Initializing application...');

      // Initialize services first
      await this.serviceManager.initialize();

      // Create main window
      const mainWindow = await this.windowManager.createMainWindow();

      // Setup IPC handlers
      await setupIpcHandlers();
      const ollamaService = this.serviceManager.getService<OllamaService>('ollama');
      if (ollamaService) {
        registerOllamaHandlers(ollamaService);
      }

      // Handle service status changes
      this.serviceManager.on('serviceStatusChanged', ({ serviceName, status, error }) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send(IPC_CHANNELS.APP.SERVICE_STATUS_CHANGED, {
            serviceName,
            status,
            error,
          });
        }
      });

      this.isInitialized = true;
      logger.info('Application initialized successfully');

    } catch (error) {
      this.errorHandler.handleError(
        new AppError(
          'Failed to initialize application',
          ErrorCategory.SYSTEM,
          ErrorSeverity.CRITICAL,
          true,
          { originalError: error }
        )
      );
      // Attempt to recover by recreating the window
      setTimeout(() => {
        if (!this.windowManager.getMainWindow()) {
          this.initialize();
        }
      }, 5000);
    }
  }

  private async quit(): Promise<void> {
    if (this.isQuitting) return;
    this.isQuitting = true;

    try {
      logger.info('Quitting application...');

      // Cleanup resources
      await this.serviceManager.cleanup();
      await this.memoryManager.cleanup();

      // Close all windows
      const windows = BrowserWindow.getAllWindows();
      for (const window of windows) {
        if (!window.isDestroyed()) {
          window.destroy();
        }
      }

      // Quit the app
      app.exit(0);

    } catch (error) {
      this.errorHandler.handleError(
        new AppError(
          'Failed to quit application gracefully',
          ErrorCategory.SYSTEM,
          ErrorSeverity.HIGH,
          true,
          { originalError: error }
        )
      );
      // Force quit after error
      app.exit(1);
    }
  }
}

// Start the application
const application = new Application();
application.start().catch((error) => {
  logger.error('Failed to start application:', error);
  app.exit(1);
}); 