import { BrowserWindow } from 'electron';
export declare class WindowManager {
    private static instance;
    private mainWindow;
    private isDevelopment;
    private errorHandler;
    private windowState;
    private readonly stateFilePath;
    private constructor();
    private loadWindowState;
    private saveWindowState;
    static getInstance(): WindowManager;
    createMainWindow(): Promise<BrowserWindow>;
    private setupWindowEvents;
    private loadApp;
    private getWindowIcon;
    private updateWindowIcon;
    getMainWindow(): BrowserWindow | null;
    minimize(): Promise<void>;
    maximize(): Promise<void>;
    close(): Promise<void>;
    isMaximized(): Promise<boolean>;
    private recoverRenderer;
    private recreateWindow;
}
