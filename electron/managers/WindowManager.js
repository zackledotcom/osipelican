"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WindowManager = void 0;

const { BrowserWindow, screen, nativeImage } = require('electron');
const path = require('path');
const { ErrorHandler, WindowError, ErrorSeverity } = require('../services/errors');

class WindowManager {
    constructor() {
        this.mainWindow = null;
        this.errorHandler = ErrorHandler.getInstance();
        this.windowStateCache = new Map();
    }

    static getInstance() {
        if (!WindowManager.instance) {
            WindowManager.instance = new WindowManager();
        }
        return WindowManager.instance;
    }

    async createMainWindow() {
        try {
            // Check if window already exists
            if (this.mainWindow && !this.mainWindow.isDestroyed()) {
                this.mainWindow.focus();
                return this.mainWindow;
            }

            // Get display bounds
            const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;

            // Window configuration
            const windowConfig = {
                width: Math.min(1200, screenWidth * 0.8),
                height: Math.min(800, screenHeight * 0.8),
                minWidth: 600,
                minHeight: 400,
                center: true,
                show: false,
                frame: process.platform === 'darwin',
                titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
                backgroundColor: '#1a1a1a',
                webPreferences: {
                    nodeIntegration: false,
                    contextIsolation: true,
                    preload: path.join(__dirname, '../preload.js'),
                    webSecurity: true,
                    allowRunningInsecureContent: false,
                    experimentalFeatures: false,
                    webviewTag: false,
                    nodeIntegrationInWorker: false,
                    nodeIntegrationInSubFrames: false,
                    safeDialogs: true,
                    safeDialogsMessage: 'This dialog is attempting to display too frequently.',
                },
                icon: this.getAppIcon(),
            };

            // Create the window
            this.mainWindow = new BrowserWindow(windowConfig);

            // Setup window events
            this.setupWindowEvents();

            // Load the app
            await this.loadApp();

            // Show window when ready
            this.mainWindow.once('ready-to-show', () => {
                if (this.mainWindow && !this.mainWindow.isDestroyed()) {
                    this.mainWindow.show();

                    // Focus window on creation
                    if (process.platform === 'darwin') {
                        this.mainWindow.focus();
                    }
                }
            });

            return this.mainWindow;

        } catch (error) {
            this.errorHandler.handleError(
                new WindowError(
                    'Failed to create main window',
                    ErrorSeverity.CRITICAL,
                    { originalError: error }
                )
            );
            throw error;
        }
    }

    setupWindowEvents() {
        if (!this.mainWindow) return;

        // Handle window closed
        this.mainWindow.on('closed', () => {
            this.mainWindow = null;
        });

        // Handle window state changes
        this.mainWindow.on('minimize', () => {
            this.windowStateCache.set('minimized', true);
        });

        this.mainWindow.on('restore', () => {
            this.windowStateCache.set('minimized', false);
        });

        this.mainWindow.on('maximize', () => {
            this.windowStateCache.set('maximized', true);
        });

        this.mainWindow.on('unmaximize', () => {
            this.windowStateCache.set('maximized', false);
        });

        // Handle navigation
        this.mainWindow.webContents.on('will-navigate', (event, url) => {
            // Prevent navigation to external URLs
            if (!url.startsWith('file://') && !url.startsWith('http://localhost')) {
                event.preventDefault();
            }
        });

        // Handle new window requests
        this.mainWindow.webContents.setWindowOpenHandler(() => {
            return { action: 'deny' };
        });

        // Handle crashes
        this.mainWindow.webContents.on('render-process-gone', (event, details) => {
            this.errorHandler.handleError(
                new WindowError(
                    'Renderer process crashed',
                    ErrorSeverity.CRITICAL,
                    { details }
                )
            );
        });
    }

    async loadApp() {
        if (!this.mainWindow) return;

        try {
            const isDev = process.env.NODE_ENV === 'development';

            if (isDev) {
                // In development, load from localhost
                await this.mainWindow.loadURL('http://localhost:5173');

                // Open DevTools in development
                this.mainWindow.webContents.openDevTools();
            } else {
                // In production, load from built files
                const indexPath = path.join(__dirname, '../../electron-app/dist/renderer/index.html');
                await this.mainWindow.loadFile(indexPath);
            }
        } catch (error) {
            this.errorHandler.handleError(
                new WindowError(
                    'Failed to load application',
                    ErrorSeverity.CRITICAL,
                    { originalError: error }
                )
            );
            throw error;
        }
    }

    getAppIcon() {
        const iconName = process.platform === 'win32' ? 'icon.ico' : 'icon.png';
        const iconPath = path.join(__dirname, '../../buildResources', iconName);

        try {
            return nativeImage.createFromPath(iconPath);
        } catch (error) {
            console.warn('Failed to load app icon:', error);
            return undefined;
        }
    }

    getMainWindow() {
        return this.mainWindow;
    }

    async closeAllWindows() {
        const windows = BrowserWindow.getAllWindows();
        for (const window of windows) {
            if (!window.isDestroyed()) {
                window.close();
            }
        }
    }

    isMinimized() {
        return this.windowStateCache.get('minimized') || false;
    }

    isMaximized() {
        return this.windowStateCache.get('maximized') || false;
    }
}

exports.WindowManager = WindowManager;
