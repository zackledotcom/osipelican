import { ServiceStatus, ServiceStatusInfo } from '../config/services';

declare global {
  interface Window {
    electronAPI: {
      // Service management
      getServiceStatus: (service: string) => Promise<ServiceStatusInfo | undefined>;
      getAllServiceStatus: () => Promise<Map<string, ServiceStatusInfo>>;
      restartService: (service: string) => Promise<void>;
      stopService: (service: string) => Promise<void>;
      
      // Event handling
      onServiceStatusChange: (callback: (event: { 
        serviceName: string; 
        status: ServiceStatus; 
        error?: string; 
        details?: Record<string, any> 
      }) => void) => () => void;
      
      // Window management
      minimize: () => Promise<void>;
      maximize: () => Promise<void>;
      close: () => Promise<void>;
      isMaximized: () => Promise<boolean>;
      
      // Theme management
      getTheme: () => Promise<'light' | 'dark' | 'system'>;
      setTheme: (theme: 'light' | 'dark' | 'system') => Promise<void>;
    };
  }
} 