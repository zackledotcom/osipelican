import React, { useEffect } from 'react';
import { AppLayout } from './components/layout/AppLayout';
import { OllamaConnectionNotification } from './components/OllamaConnectionNotification';
import type { OllamaModel, ModelLoadingState, OllamaConnectionStatus } from '@shared/types/ollama';
import type { ServiceName } from './types/services';

interface ElectronAPI {
  ipc: {
    invoke: <T = any>(channel: string, ...args: any[]) => Promise<T>;
    on: (channel: string, callback: (...args: any[]) => void) => () => void;
    once: (channel: string, callback: (...args: any[]) => void) => void;
    removeListener: (channel: string, callback: (...args: any[]) => void) => () => void;
    removeAllListeners: (channel: string) => void;
  };
  ollama: {
    listModels: () => Promise<{ models: OllamaModel[] }>;
    setModel: (modelName: string) => Promise<void>;
    checkConnection: () => Promise<OllamaConnectionStatus>;
    cancelLoad: () => Promise<void>;
    saveConfig: (config: { model: string }) => Promise<void>;
    onModelLoadingStateChanged: (callback: (state: ModelLoadingState) => void) => () => void;
  };
  vectorStore: {
    search: (query: string) => Promise<any>;
    add: (doc: { id: string; content: string }) => Promise<void>;
    delete: (id: string) => Promise<void>;
    clear: () => Promise<void>;
    stats: () => Promise<any>;
  };
  app: {
    healthCheck: () => Promise<void>;
    retryService: (serviceName: ServiceName) => Promise<void>;
    showSetupGuide: () => Promise<void>;
    showTroubleshooter: () => Promise<void>;
  };
  memory: {
    stats: () => Promise<void>;
    reset: () => Promise<void>;
  };
  getServiceStatus: (service: string) => Promise<any>;
  getAllServiceStatus: () => Promise<Map<string, any>>;
  restartService: (service: string) => Promise<void>;
  onServiceStatusChange: (callback: (event: any) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export function App() {
  useEffect(() => {
    console.log('window.electronAPI:', window.electronAPI);
  }, []);

  return (
    <>
      <OllamaConnectionNotification />
      <AppLayout />
    </>
  );
}
