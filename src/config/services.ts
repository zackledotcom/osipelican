import { app } from 'electron';
import * as path from 'path';
import * as os from 'os';
import fs from 'fs';

// Base paths for different operating systems
const BASE_PATHS = {
  darwin: {
    ollama: path.join(os.homedir(), '.ollama'),
    chroma: path.join(os.homedir(), '.chroma'),
  },
  win32: {
    ollama: path.join(os.homedir(), 'AppData', 'Local', 'Ollama'),
    chroma: path.join(os.homedir(), 'AppData', 'Local', 'Chroma'),
  },
  linux: {
    ollama: path.join(os.homedir(), '.ollama'),
    chroma: path.join(os.homedir(), '.chroma'),
  },
} as const;

// Service configuration
export const SERVICE_CONFIG = {
  // Ollama configuration
  ollama: {
    basePath: process.platform === 'darwin' 
      ? path.join(app.getPath('home'), 'Library', 'Application Support', 'Ollama')
      : process.platform === 'win32'
        ? path.join(app.getPath('appData'), 'Ollama')
        : path.join(app.getPath('home'), '.ollama'),
    modelsPath: path.join(app.getPath('userData'), 'models'),
    configPath: path.join(app.getPath('userData'), 'config'),
    defaultModel: 'llama2',
    apiEndpoint: 'http://localhost:11434',
    timeout: 30000,
    maxRetries: 3,
    retryDelay: 1000,
    healthCheckInterval: 5000,
  },

  // Chroma configuration
  chroma: {
    dataPath: path.join(app.getPath('userData'), 'chroma'),
    collectionName: 'documents',
    embeddingDimension: 1536,
    apiEndpoint: 'http://localhost:8000',
    timeout: 30000,
    healthCheckInterval: 5000,
  },

  // Application-specific paths
  app: {
    userData: app.getPath('userData'),
    logs: path.join(app.getPath('userData'), 'logs'),
    temp: path.join(app.getPath('temp'), 'osipelican'),
    cache: path.join(app.getPath('userData'), 'cache'),
  },

  // Service status tracking
  status: {
    checkInterval: 5000,
    timeout: 5000,
    maxRetries: 3,
  },
} as const;

// Type for service configuration
export type ServiceConfig = typeof SERVICE_CONFIG;

// Helper functions
export const getServicePath = (service: keyof typeof SERVICE_CONFIG): string => {
  const config = SERVICE_CONFIG[service];
  if ('basePath' in config) {
    return config.basePath;
  }
  if ('dataPath' in config) {
    return config.dataPath;
  }
  throw new Error(`Invalid service: ${service}`);
};

export const ensureServiceDirectories = () => {
  // Ensure Ollama directories exist
  fs.mkdirSync(SERVICE_CONFIG.ollama.modelsPath, { recursive: true });
  fs.mkdirSync(SERVICE_CONFIG.ollama.configPath, { recursive: true });

  // Ensure Chroma directory exists
  fs.mkdirSync(SERVICE_CONFIG.chroma.dataPath, { recursive: true });

  // Ensure app directories exist
  fs.mkdirSync(SERVICE_CONFIG.app.logs, { recursive: true });
  fs.mkdirSync(SERVICE_CONFIG.app.temp, { recursive: true });
  fs.mkdirSync(SERVICE_CONFIG.app.cache, { recursive: true });
};

// Service health check configuration
export const HEALTH_CHECK_CONFIG = {
  ollama: {
    endpoint: `${SERVICE_CONFIG.ollama.apiEndpoint}/api/health`,
    timeout: SERVICE_CONFIG.ollama.timeout,
  },
  chroma: {
    endpoint: `${SERVICE_CONFIG.chroma.apiEndpoint}/api/v1/heartbeat`,
    timeout: SERVICE_CONFIG.chroma.timeout,
  },
} as const;

// Export types
export type ServiceHealthCheckConfig = typeof HEALTH_CHECK_CONFIG;
export type ServiceStatus = 
  | 'unknown'
  | 'running'
  | 'error'
  | 'stopped'
  | 'restarting'
  | 'stopping';

// Service status interface
export interface ServiceStatusInfo {
  status: ServiceStatus;
  error?: string;
  lastUpdated: string;
  details?: Record<string, any>;
} 