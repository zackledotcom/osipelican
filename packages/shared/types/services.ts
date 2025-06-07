// Shared types for service management

export type ServiceName = 'ollama' | 'embedding' | 'vectorStore' | 'memory' | string;

export type ServiceState = 'starting' | 'running' | 'stopped' | 'error' | 'restarting' | 'unavailable';

export interface ServiceStatus {
  name: ServiceName;
  state: ServiceState;
  error?: string;
  lastChecked?: number;
} 