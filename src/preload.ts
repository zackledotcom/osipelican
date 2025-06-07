import { contextBridge, ipcRenderer } from 'electron';
import type { 
  OllamaModel, 
  OllamaConnectionStatus,
  ModelLoadingState,
  OllamaRequestOptions,
  OllamaResponse
} from './types/ollama';
import { ServiceStatus, ServiceStatusInfo } from './config/services';

console.log('[PRELOAD] Preload script started');

// Define the API that will be exposed to the renderer
interface ElectronAPI {
  // Service management
  getServiceStatus: (service: string) => Promise<ServiceStatusInfo | undefined>;
  getAllServiceStatus: () => Promise<Map<string, ServiceStatusInfo>>;
  restartService: (service: string) => Promise<void>;
  stopService: (service: string) => Promise<void>;
  
  // Event handling
  onServiceStatusChange: (callback: (event: { serviceName: string; status: ServiceStatus; error?: string; details?: Record<string, any> }) => void) => () => void;
  
  // Window management
  minimize: () => Promise<void>;
  maximize: () => Promise<void>;
  close: () => Promise<void>;
  isMaximized: () => Promise<boolean>;
  
  // Theme management
  getTheme: () => Promise<'light' | 'dark' | 'system'>;
  setTheme: (theme: 'light' | 'dark' | 'system') => Promise<void>;
}

// Validate channel names for security
const VALID_CHANNELS = [
  'service:getStatus',
  'service:getAllStatus',
  'service:restart',
  'service:stop',
  'service:statusChanged',
  'window:minimize',
  'window:maximize',
  'window:close',
  'window:isMaximized',
  'theme:get',
  'theme:set',
  'app:get-theme',
  'app:set-theme',
  'app:theme-updated',
] as const;

type ValidChannel = typeof VALID_CHANNELS[number];

// Helper function to validate channel names
function isValidChannel(channel: string): channel is ValidChannel {
  return VALID_CHANNELS.includes(channel as ValidChannel);
}

// Helper function for safe IPC calls
async function safeInvoke(channel: string, ...args: any[]): Promise<any> {
  if (!isValidChannel(channel)) {
    throw new Error(`Invalid IPC channel: ${channel}`);
  }
  return ipcRenderer.invoke(channel, ...args);
}

// Helper function for safe event listener registration
function safeOn(channel: string, callback: (...args: any[]) => void): () => void {
  if (!isValidChannel(channel)) {
    throw new Error(`Invalid IPC channel: ${channel}`);
  }
  ipcRenderer.on(channel, (_event, ...args) => callback(...args));
  return () => {
    ipcRenderer.removeListener(channel, callback);
  };
}

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Service management
  getServiceStatus: (service: string) => safeInvoke('service:getStatus', service),
  getAllServiceStatus: () => safeInvoke('service:getAllStatus'),
  restartService: (service: string) => safeInvoke('service:restart', service),
  stopService: (service: string) => safeInvoke('service:stop', service),
  
  // Event handling
  onServiceStatusChange: (callback: (event: { serviceName: string; status: ServiceStatus; error?: string; details?: Record<string, any> }) => void) => 
    safeOn('service:statusChanged', callback),
  
  // Window management
  minimize: () => safeInvoke('window:minimize'),
  maximize: () => safeInvoke('window:maximize'),
  close: () => safeInvoke('window:close'),
  isMaximized: () => safeInvoke('window:isMaximized'),
  
  // Theme management
  getTheme: () => safeInvoke('app:get-theme'),
  setTheme: (theme: 'light' | 'dark' | 'system') => safeInvoke('app:set-theme', theme),
  onThemeUpdated: (callback: (themeData: { theme: 'light' | 'dark' | 'system', shouldUseDarkColors: boolean }) => void) =>
    safeOn('app:theme-updated', callback),
} as ElectronAPI);

// Log successful preload
console.log('Preload script executed successfully');

// Optional: Expose type definitions for renderer process
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
} 