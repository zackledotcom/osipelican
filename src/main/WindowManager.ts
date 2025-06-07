import { BrowserWindow, nativeTheme, nativeImage, screen, app } from 'electron';
import { logger } from '../utils/logger';
import * as path from 'path';
import * as fs from 'fs';
import { ErrorHandler, WindowError, ErrorCategory, ErrorSeverity } from '../utils/errors';

interface WindowState {
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  isMaximized: boolean;
  isFullScreen: boolean;
}

export class WindowManager {
  private static instance: WindowManager;
  private mainWindow: BrowserWindow | null = null;
  private isDevelopment = process.env.NODE_ENV === 'development';
  private errorHandler: ErrorHandler;
  private windowState: WindowState;
  private readonly stateFilePath: string;

  private constructor() {
    this.errorHandler = ErrorHandler.getInstance();
    this.stateFilePath = path.join(app.getPath('userData'), 'window-state.json');
    this.windowState = this.loadWindowState();
  }

  private loadWindowState(): WindowState {
    try {
      if (fs.existsSync(this.stateFilePath)) {
        const data = fs.readFileSync(this.stateFilePath, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      this.errorHandler.handleError(
        new WindowError(
          'Failed to load window state',
          ErrorSeverity.LOW,
          { originalError: error }
        )
      );
    }

    // Default state
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    return {
      bounds: {
        x: Math.floor(width * 0.1),
        y: Math.floor(height * 0.1),
        width: Math.floor(width * 0.8),
        height: Math.floor(height * 0.8),
      },
      isMaximized: false,
      isFullScreen: false,
    };
  }

  private saveWindowState(): void {
    if (!this.mainWindow) return;

    try {
      const state: WindowState = {
        bounds: this.mainWindow.getBounds(),
        isMaximized: this.mainWindow.isMaximized(),
        isFullScreen: this.mainWindow.isFullScreen(),
      };

      fs.writeFileSync(this.stateFilePath, JSON.stringify(state, null, 2));
    } catch (error) {
      this.errorHandler.handleError(
        new WindowError(
          'Failed to save window state',
          ErrorSeverity.LOW,
          { originalError: error }
        )
      );
    }
  }

  public static getInstance(): WindowManager {
    if (!WindowManager.instance) {
      WindowManager.instance = new WindowManager();
    }
    return WindowManager.instance;
  }

  public async createMainWindow(): Promise<BrowserWindow> {
    if (this.mainWindow) {
      return this.mainWindow;
    }

    try {
      // Create the browser window with optimized settings
      this.mainWindow = new BrowserWindow({
        ...this.windowState.bounds,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: true,
          preload: path.join(__dirname, '../preload.js'),
          webSecurity: true,
          allowRunningInsecureContent: false,
        },
        show: false,
        backgroundColor: '#1a1a1a',
        icon: this.getWindowIcon(),
        titleBarStyle: 'hidden',
        titleBarOverlay: {
          color: '#2f3241',
          symbolColor: '#74b1be',
          height: 30
        },
        frame: false,
      });

      // Restore window state
      if (this.windowState.isMaximized) {
        this.mainWindow.maximize();
      }
      if (this.windowState.isFullScreen) {
        this.mainWindow.setFullScreen(true);
      }

      // Setup window events
      this.setupWindowEvents();
      
      // Load the app
      await this.loadApp();

      return this.mainWindow;
    } catch (error) {
      this.errorHandler.handleError(
        new WindowError(
          'Failed to create main window',
          ErrorSeverity.HIGH,
          { originalError: error }
        )
      );
      throw error;
    }
  }

  private setupWindowEvents(): void {
    if (!this.mainWindow) return;

    // Show window when ready
    this.mainWindow.once('ready-to-show', () => {
      logger.debug('Window ready to show');
      setTimeout(() => {
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.mainWindow.show();
        }
      }, 50);
    });

    // Handle window state changes
    this.mainWindow.on('maximize', () => {
      logger.debug('Window maximized');
      this.saveWindowState();
    });

    this.mainWindow.on('unmaximize', () => {
      logger.debug('Window unmaximized');
      this.saveWindowState();
    });

    this.mainWindow.on('move', () => {
      this.saveWindowState();
    });

    this.mainWindow.on('resize', () => {
      this.saveWindowState();
    });

    this.mainWindow.on('enter-full-screen', () => {
      this.saveWindowState();
    });

    this.mainWindow.on('leave-full-screen', () => {
      this.saveWindowState();
    });

    // Handle window close
    this.mainWindow.on('close', (event) => {
      // Save state before closing
      this.saveWindowState();
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    // Handle renderer process crashes
    this.mainWindow.webContents.on('crashed', () => {
      this.errorHandler.handleError(
        new WindowError(
          'Renderer process crashed',
          ErrorSeverity.HIGH,
          { windowId: this.mainWindow?.id }
        )
      );
      this.recoverRenderer();
    });

    // Handle renderer process hangs
    this.mainWindow.webContents.on('unresponsive', () => {
      this.errorHandler.handleError(
        new WindowError(
          'Renderer process became unresponsive',
          ErrorSeverity.HIGH,
          { windowId: this.mainWindow?.id }
        )
      );
      this.recoverRenderer();
    });

    // Handle renderer load failures
    this.mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      this.errorHandler.handleError(
        new WindowError(
          'Failed to load renderer',
          ErrorSeverity.MEDIUM,
          { errorCode, errorDescription }
        )
      );
      this.recoverRenderer();
    });

    // Handle theme changes
    nativeTheme.on('updated', () => {
      if (this.mainWindow) {
        this.updateWindowIcon();
      }
    });
  }

  private async loadApp(): Promise<void> {
    if (!this.mainWindow) return;

    try {
      if (this.isDevelopment) {
        const devUrl = 'http://localhost:5173';
        logger.debug('Loading renderer from:', devUrl);
        await this.mainWindow.loadURL(devUrl);
        this.mainWindow.webContents.openDevTools();
      } else {
        const prodPath = path.join(__dirname, '../../renderer/dist/index.html');
        logger.debug('Loading renderer from:', prodPath);
        await this.mainWindow.loadFile(prodPath);
      }
    } catch (error) {
      this.errorHandler.handleError(
        new WindowError(
          'Failed to load app',
          ErrorSeverity.HIGH,
          { originalError: error }
        )
      );
      throw error;
    }
  }

  private getWindowIcon(): Electron.NativeImage {
    try {
      const defaultIcon = path.join(__dirname, '../assets/icon.png');
      const logoPath = path.join(process.cwd(), 'buildResources', 'logo-DARK.png');
      const iconPath = fs.existsSync(logoPath) ? logoPath : defaultIcon;
      return nativeImage.createFromPath(iconPath);
    } catch (error) {
      this.errorHandler.handleError(
        new WindowError(
          'Failed to load window icon',
          ErrorSeverity.LOW,
          { originalError: error }
        )
      );
      // Return a default icon or throw if critical
      throw error;
    }
  }

  private updateWindowIcon(): void {
    if (!this.mainWindow) return;
    try {
      this.mainWindow.setIcon(this.getWindowIcon());
    } catch (error) {
      this.errorHandler.handleError(
        new WindowError(
          'Failed to update window icon',
          ErrorSeverity.LOW,
          { originalError: error }
        )
      );
    }
  }

  public getMainWindow(): BrowserWindow | null {
    return this.mainWindow;
  }

  public async minimize(): Promise<void> {
    try {
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.minimize();
      }
    } catch (error) {
      this.errorHandler.handleError(
        new WindowError(
          'Failed to minimize window',
          ErrorSeverity.LOW,
          { originalError: error }
        )
      );
    }
  }

  public async maximize(): Promise<void> {
    try {
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        if (this.mainWindow.isMaximized()) {
          this.mainWindow.unmaximize();
        } else {
          this.mainWindow.maximize();
        }
      }
    } catch (error) {
      this.errorHandler.handleError(
        new WindowError(
          'Failed to maximize/unmaximize window',
          ErrorSeverity.LOW,
          { originalError: error }
        )
      );
    }
  }

  public async close(): Promise<void> {
    try {
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.close();
      }
    } catch (error) {
      this.errorHandler.handleError(
        new WindowError(
          'Failed to close window',
          ErrorSeverity.MEDIUM,
          { originalError: error }
        )
      );
    }
  }

  public async isMaximized(): Promise<boolean> {
    try {
      return this.mainWindow?.isMaximized() ?? false;
    } catch (error) {
      this.errorHandler.handleError(
        new WindowError(
          'Failed to check window maximized state',
          ErrorSeverity.LOW,
          { originalError: error }
        )
      );
      return false;
    }
  }

  private async recoverRenderer(): Promise<void> {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      return;
    }

    try {
      // Attempt to reload the window
      await this.mainWindow.loadURL(this.mainWindow.webContents.getURL());
      logger.info('Renderer recovered successfully');
    } catch (error) {
      this.errorHandler.handleError(
        new WindowError(
          'Failed to recover renderer',
          ErrorSeverity.HIGH,
          { originalError: error }
        )
      );
      
      // If recovery fails, try recreating the window
      try {
        await this.recreateWindow();
      } catch (recreateError) {
        this.errorHandler.handleError(
          new WindowError(
            'Failed to recreate window after renderer crash',
            ErrorSeverity.CRITICAL,
            { originalError: recreateError }
          )
        );
      }
    }
  }

  private async recreateWindow(): Promise<void> {
    if (this.mainWindow) {
      const oldWindow = this.mainWindow;
      this.mainWindow = null;
      oldWindow.destroy();
    }
    await this.createMainWindow();
  }
} 