"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const handlers_1 = require("./ipc/handlers");
const logger_1 = require("./utils/logger");
const ServiceManager_1 = require("./services/ServiceManager");
const channels_1 = require("./ipc/channels");
require("./ipc/app");
require("./ipc/memory");
const memoryManager_1 = require("./utils/memoryManager");
const WindowManager_1 = require("./main/WindowManager");
const errors_1 = require("./utils/errors");
const ollama_1 = require("./ipc/ollama");
// Configure V8 heap limit
const v8HeapLimit = 1024; // Reduced to 1GB for optimization
if (process.platform === 'darwin') {
    // On macOS, we need to set this before app is ready
    electron_1.app.commandLine.appendSwitch('js-flags', `--max-old-space-size=${v8HeapLimit}`);
}
else {
    // On other platforms, we can set it directly
    process.env.NODE_OPTIONS = `--max-old-space-size=${v8HeapLimit}`;
}
// Log the heap limit configuration
logger_1.logger.info(`V8 heap limit set to ${v8HeapLimit}MB`);
// Debug: Log memory usage periodically and trigger GC
setInterval(() => {
    if (global.gc) {
        global.gc();
    }
    const used = process.memoryUsage();
    logger_1.logger.debug('Memory usage:', {
        heapTotal: `${Math.round(used.heapTotal / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(used.heapUsed / 1024 / 1024)}MB`,
        external: `${Math.round(used.external / 1024 / 1024)}MB`,
        rss: `${Math.round(used.rss / 1024 / 1024)}MB`,
    });
}, 30000); // Log every 30 seconds
class Application {
    constructor() {
        this.isInitialized = false;
        this.isQuitting = false;
        this.windowManager = WindowManager_1.WindowManager.getInstance();
        this.serviceManager = ServiceManager_1.ServiceManager.getInstance();
        this.errorHandler = errors_1.ErrorHandler.getInstance();
        this.memoryManager = memoryManager_1.MemoryManager.getInstance();
    }
    async start() {
        try {
            // Prevent multiple instances
            const gotTheLock = electron_1.app.requestSingleInstanceLock();
            if (!gotTheLock) {
                electron_1.app.quit();
                return;
            }
            // Handle second instance
            electron_1.app.on('second-instance', () => {
                const window = this.windowManager.getMainWindow();
                if (window) {
                    if (window.isMinimized())
                        window.restore();
                    window.focus();
                }
            });
            // Setup app events
            this.setupAppEvents();
            // Wait for app to be ready
            await new Promise((resolve) => {
                if (electron_1.app.isReady()) {
                    resolve();
                }
                else {
                    electron_1.app.once('ready', () => resolve());
                }
            });
            // Initialize application
            await this.initialize();
        }
        catch (error) {
            this.errorHandler.handleError(new errors_1.AppError('Failed to start application', errors_1.ErrorCategory.SYSTEM, errors_1.ErrorSeverity.CRITICAL, true, { originalError: error }));
            electron_1.app.quit();
        }
    }
    setupAppEvents() {
        // Handle window management
        electron_1.app.on('window-all-closed', () => {
            if (process.platform !== 'darwin') {
                this.quit();
            }
        });
        electron_1.app.on('activate', () => {
            if (!this.windowManager.getMainWindow()) {
                this.initialize();
            }
        });
        // Handle theme changes
        electron_1.nativeTheme.on('updated', () => {
            const window = this.windowManager.getMainWindow();
            if (window) {
                window.webContents.send(channels_1.IPC_CHANNELS.APP.THEME_UPDATED, {
                    theme: electron_1.nativeTheme.shouldUseDarkColors ? 'dark' : 'light',
                    shouldUseDarkColors: electron_1.nativeTheme.shouldUseDarkColors
                });
            }
        });
        // Handle app quit
        electron_1.app.on('before-quit', async (event) => {
            if (!this.isQuitting) {
                event.preventDefault();
                await this.quit();
            }
        });
        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            this.errorHandler.handleError(new errors_1.AppError('Uncaught exception', errors_1.ErrorCategory.SYSTEM, errors_1.ErrorSeverity.HIGH, true, { originalError: error }));
        });
        // Handle unhandled rejections
        process.on('unhandledRejection', (reason) => {
            this.errorHandler.handleError(new errors_1.AppError('Unhandled rejection', errors_1.ErrorCategory.SYSTEM, errors_1.ErrorSeverity.HIGH, true, { originalError: reason }));
        });
    }
    async initialize() {
        if (this.isInitialized)
            return;
        try {
            logger_1.logger.info('Initializing application...');
            // Initialize services first
            await this.serviceManager.initialize();
            // Create main window
            const mainWindow = await this.windowManager.createMainWindow();
            // Setup IPC handlers
            await (0, handlers_1.setupIpcHandlers)();
            const ollamaService = this.serviceManager.getService('ollama');
            if (ollamaService) {
                (0, ollama_1.registerOllamaHandlers)(ollamaService);
            }
            // Handle service status changes
            this.serviceManager.on('serviceStatusChanged', ({ serviceName, status, error }) => {
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send(channels_1.IPC_CHANNELS.APP.SERVICE_STATUS_CHANGED, {
                        serviceName,
                        status,
                        error,
                    });
                }
            });
            this.isInitialized = true;
            logger_1.logger.info('Application initialized successfully');
        }
        catch (error) {
            this.errorHandler.handleError(new errors_1.AppError('Failed to initialize application', errors_1.ErrorCategory.SYSTEM, errors_1.ErrorSeverity.CRITICAL, true, { originalError: error }));
            // Attempt to recover by recreating the window
            setTimeout(() => {
                if (!this.windowManager.getMainWindow()) {
                    this.initialize();
                }
            }, 5000);
        }
    }
    async quit() {
        if (this.isQuitting)
            return;
        this.isQuitting = true;
        try {
            logger_1.logger.info('Quitting application...');
            // Cleanup resources
            await this.serviceManager.cleanup();
            await this.memoryManager.cleanup();
            // Close all windows
            const windows = electron_1.BrowserWindow.getAllWindows();
            for (const window of windows) {
                if (!window.isDestroyed()) {
                    window.destroy();
                }
            }
            // Quit the app
            electron_1.app.exit(0);
        }
        catch (error) {
            this.errorHandler.handleError(new errors_1.AppError('Failed to quit application gracefully', errors_1.ErrorCategory.SYSTEM, errors_1.ErrorSeverity.HIGH, true, { originalError: error }));
            // Force quit after error
            electron_1.app.exit(1);
        }
    }
}
// Start the application
const application = new Application();
application.start().catch((error) => {
    logger_1.logger.error('Failed to start application:', error);
    electron_1.app.exit(1);
});
//# sourceMappingURL=main.js.map