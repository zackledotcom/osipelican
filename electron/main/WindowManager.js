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
exports.WindowManager = void 0;
const electron_1 = require("electron");
const logger_1 = require("./utils/logger");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const errors_1 = require("./utils/errors");
class WindowManager {
    constructor() {
        this.mainWindow = null;
        this.isDevelopment = process.env.NODE_ENV === 'development';
        this.errorHandler = errors_1.ErrorHandler.getInstance();
        this.stateFilePath = path.join(electron_1.app.getPath('userData'), 'window-state.json');
        this.windowState = this.loadWindowState();
    }
    loadWindowState() {
        try {
            if (fs.existsSync(this.stateFilePath)) {
                const data = fs.readFileSync(this.stateFilePath, 'utf8');
                return JSON.parse(data);
            }
        }
        catch (error) {
            this.errorHandler.handleError(new errors_1.WindowError('Failed to load window state', errors_1.ErrorSeverity.LOW, { originalError: error }));
        }
        // Default state
        const { width, height } = electron_1.screen.getPrimaryDisplay().workAreaSize;
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
    saveWindowState() {
        if (!this.mainWindow)
            return;
        try {
            const state = {
                bounds: this.mainWindow.getBounds(),
                isMaximized: this.mainWindow.isMaximized(),
                isFullScreen: this.mainWindow.isFullScreen(),
            };
            fs.writeFileSync(this.stateFilePath, JSON.stringify(state, null, 2));
        }
        catch (error) {
            this.errorHandler.handleError(new errors_1.WindowError('Failed to save window state', errors_1.ErrorSeverity.LOW, { originalError: error }));
        }
    }
    static getInstance() {
        if (!WindowManager.instance) {
            WindowManager.instance = new WindowManager();
        }
        return WindowManager.instance;
    }
    async createMainWindow() {
        if (this.mainWindow) {
            return this.mainWindow;
        }
        try {
            // Create the browser window with optimized settings
            this.mainWindow = new electron_1.BrowserWindow({
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
        }
        catch (error) {
            this.errorHandler.handleError(new errors_1.WindowError('Failed to create main window', errors_1.ErrorSeverity.HIGH, { originalError: error }));
            throw error;
        }
    }
    setupWindowEvents() {
        if (!this.mainWindow)
            return;
        // Show window when ready
        this.mainWindow.once('ready-to-show', () => {
            logger_1.logger.debug('Window ready to show');
            setTimeout(() => {
                if (this.mainWindow && !this.mainWindow.isDestroyed()) {
                    this.mainWindow.show();
                }
            }, 50);
        });
        // Handle window state changes
        this.mainWindow.on('maximize', () => {
            logger_1.logger.debug('Window maximized');
            this.saveWindowState();
        });
        this.mainWindow.on('unmaximize', () => {
            logger_1.logger.debug('Window unmaximized');
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
            this.errorHandler.handleError(new errors_1.WindowError('Renderer process crashed', errors_1.ErrorSeverity.HIGH, { windowId: this.mainWindow?.id }));
            this.recoverRenderer();
        });
        // Handle renderer process hangs
        this.mainWindow.webContents.on('unresponsive', () => {
            this.errorHandler.handleError(new errors_1.WindowError('Renderer process became unresponsive', errors_1.ErrorSeverity.HIGH, { windowId: this.mainWindow?.id }));
            this.recoverRenderer();
        });
        // Handle renderer load failures
        this.mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
            this.errorHandler.handleError(new errors_1.WindowError('Failed to load renderer', errors_1.ErrorSeverity.MEDIUM, { errorCode, errorDescription }));
            this.recoverRenderer();
        });
        // Handle theme changes
        electron_1.nativeTheme.on('updated', () => {
            if (this.mainWindow) {
                this.updateWindowIcon();
            }
        });
    }
    async loadApp() {
        if (!this.mainWindow)
            return;
        try {
            if (this.isDevelopment) {
                const devUrl = 'http://localhost:5173';
                logger_1.logger.debug('Loading renderer from:', devUrl);
                await this.mainWindow.loadURL(devUrl);
                this.mainWindow.webContents.openDevTools();
            }
            else {
                const prodPath = path.join(__dirname, '../dist/renderer/index.html');
                logger_1.logger.debug('Loading renderer from:', prodPath);
                await this.mainWindow.loadFile(prodPath);
            }
        }
        catch (error) {
            this.errorHandler.handleError(new errors_1.WindowError('Failed to load app', errors_1.ErrorSeverity.HIGH, { originalError: error }));
            throw error;
        }
    }
    getWindowIcon() {
        try {
            const defaultIcon = path.join(__dirname, '../assets/icon.png');
            const logoPath = path.join(process.cwd(), 'buildResources', 'logo-DARK.png');
            const iconPath = fs.existsSync(logoPath) ? logoPath : defaultIcon;
            return electron_1.nativeImage.createFromPath(iconPath);
        }
        catch (error) {
            this.errorHandler.handleError(new errors_1.WindowError('Failed to load window icon', errors_1.ErrorSeverity.LOW, { originalError: error }));
            // Return a default icon or throw if critical
            throw error;
        }
    }
    updateWindowIcon() {
        if (!this.mainWindow)
            return;
        try {
            this.mainWindow.setIcon(this.getWindowIcon());
        }
        catch (error) {
            this.errorHandler.handleError(new errors_1.WindowError('Failed to update window icon', errors_1.ErrorSeverity.LOW, { originalError: error }));
        }
    }
    getMainWindow() {
        return this.mainWindow;
    }
    async minimize() {
        try {
            if (this.mainWindow && !this.mainWindow.isDestroyed()) {
                this.mainWindow.minimize();
            }
        }
        catch (error) {
            this.errorHandler.handleError(new errors_1.WindowError('Failed to minimize window', errors_1.ErrorSeverity.LOW, { originalError: error }));
        }
    }
    async maximize() {
        try {
            if (this.mainWindow && !this.mainWindow.isDestroyed()) {
                if (this.mainWindow.isMaximized()) {
                    this.mainWindow.unmaximize();
                }
                else {
                    this.mainWindow.maximize();
                }
            }
        }
        catch (error) {
            this.errorHandler.handleError(new errors_1.WindowError('Failed to maximize/unmaximize window', errors_1.ErrorSeverity.LOW, { originalError: error }));
        }
    }
    async close() {
        try {
            if (this.mainWindow && !this.mainWindow.isDestroyed()) {
                this.mainWindow.close();
            }
        }
        catch (error) {
            this.errorHandler.handleError(new errors_1.WindowError('Failed to close window', errors_1.ErrorSeverity.MEDIUM, { originalError: error }));
        }
    }
    async isMaximized() {
        try {
            return this.mainWindow?.isMaximized() ?? false;
        }
        catch (error) {
            this.errorHandler.handleError(new errors_1.WindowError('Failed to check window maximized state', errors_1.ErrorSeverity.LOW, { originalError: error }));
            return false;
        }
    }
    async recoverRenderer() {
        if (!this.mainWindow || this.mainWindow.isDestroyed()) {
            return;
        }
        try {
            // Attempt to reload the window
            await this.mainWindow.loadURL(this.mainWindow.webContents.getURL());
            logger_1.logger.info('Renderer recovered successfully');
        }
        catch (error) {
            this.errorHandler.handleError(new errors_1.WindowError('Failed to recover renderer', errors_1.ErrorSeverity.HIGH, { originalError: error }));
            // If recovery fails, try recreating the window
            try {
                await this.recreateWindow();
            }
            catch (recreateError) {
                this.errorHandler.handleError(new errors_1.WindowError('Failed to recreate window after renderer crash', errors_1.ErrorSeverity.CRITICAL, { originalError: recreateError }));
            }
        }
    }
    async recreateWindow() {
        if (this.mainWindow) {
            const oldWindow = this.mainWindow;
            this.mainWindow = null;
            oldWindow.destroy();
        }
        await this.createMainWindow();
    }
}
exports.WindowManager = WindowManager;
//# sourceMappingURL=WindowManager.js.map