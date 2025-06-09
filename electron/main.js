const { app, BrowserWindow, nativeTheme } = require('electron');
const path = require('path');

// Register all core services + IPC
require('./ipc/app');
require('./ipc/memory');
require('./ipc/ollama');
const { MemoryManager } = require('./services/memoryManager.js');
const { WindowManager } = require('./managers/WindowManager.js');
const { ErrorHandler, AppError, ErrorSeverity, ErrorCategory } = require('./services/errors.js');
const { IPC_CHANNELS } = require('./ipc/channels.js');

// Configure V8 heap
const V8_HEAP_MB = 1024;
app.commandLine.appendSwitch('js-flags', `--max-old-space-size=${V8_HEAP_MB}`);

class Application {
  constructor() {
    this.windowManager = null;
    this.memoryManager = MemoryManager.getInstance();
    this.errorHandler = ErrorHandler.getInstance();
    this.isInitialized = false;
    this.isQuitting = false;
  }

  async start() {
    try {
      if (!app.requestSingleInstanceLock()) return app.quit();
      app.on('second-instance', () => {
        const win = this.windowManager?.getMainWindow();
        if (win) {
          if (win.isMinimized()) win.restore();
          win.focus();
        }
      });
      this.setupEvents();
      await app.whenReady();
      await this.initialize();
    } catch (err) {
      this.errorHandler.handleError(
          new AppError('Startup error', ErrorCategory.SYSTEM, ErrorSeverity.CRITICAL, true, { originalError: err })
      );
      app.quit();
    }
  }

  setupEvents() {
    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') this.quit();
    });

    app.on('activate', () => {
      if (this.windowManager && !this.windowManager.getMainWindow()) {
        this.initialize();
      }
    });

    nativeTheme.on('updated', () => {
      const win = this.windowManager?.getMainWindow();
      if (win) {
        win.webContents.send(IPC_CHANNELS.APP.THEME_UPDATED, {
          theme: nativeTheme.shouldUseDarkColors ? 'dark' : 'light',
          shouldUseDarkColors: nativeTheme.shouldUseDarkColors
        });
      }
    });

    app.on('before-quit', async (e) => {
      if (!this.isQuitting) {
        e.preventDefault();
        await this.quit();
      }
    });

    process.on('uncaughtException', (err) => {
      this.errorHandler.handleError(new AppError('Uncaught', ErrorCategory.SYSTEM, ErrorSeverity.HIGH, true, { originalError: err }));
    });

    process.on('unhandledRejection', (reason) => {
      this.errorHandler.handleError(new AppError('Unhandled Promise', ErrorCategory.SYSTEM, ErrorSeverity.HIGH, true, { originalError: reason }));
    });
  }

  async initialize() {
    if (this.isInitialized) return;
    try {
      this.windowManager = WindowManager.getInstance();
      await this.windowManager.createMainWindow({
        width: 1280,
        height: 800,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          preload: path.join(__dirname, 'preload.js'),
          sandbox: false,
        },
      });
      this.isInitialized = true;
    } catch (err) {
      this.errorHandler.handleError(new AppError('Init failed', ErrorCategory.SYSTEM, ErrorSeverity.CRITICAL, true, { originalError: err }));
      setTimeout(() => {
        if (!this.windowManager?.getMainWindow()) this.initialize();
      }, 3000);
    }
  }

  async quit() {
    if (this.isQuitting) return;
    this.isQuitting = true;

    try {
      await this.memoryManager.cleanup();
      for (const win of BrowserWindow.getAllWindows()) {
        if (!win.isDestroyed()) win.destroy();
      }
      app.exit(0);
    } catch (err) {
      this.errorHandler.handleError(new AppError('Quit failed', ErrorCategory.SYSTEM, ErrorSeverity.HIGH, true, { originalError: err }));
      app.exit(1);
    }
  }
}

new Application().start().catch(err => {
  console.error('Boot failure:', err);
  app.exit(1);
});