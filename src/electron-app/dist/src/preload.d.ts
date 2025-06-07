import { ServiceStatus, ServiceStatusInfo } from './config/services';
interface ElectronAPI {
    getServiceStatus: (service: string) => Promise<ServiceStatusInfo | undefined>;
    getAllServiceStatus: () => Promise<Map<string, ServiceStatusInfo>>;
    restartService: (service: string) => Promise<void>;
    stopService: (service: string) => Promise<void>;
    onServiceStatusChange: (callback: (event: {
        serviceName: string;
        status: ServiceStatus;
        error?: string;
        details?: Record<string, any>;
    }) => void) => () => void;
    minimize: () => Promise<void>;
    maximize: () => Promise<void>;
    close: () => Promise<void>;
    isMaximized: () => Promise<boolean>;
    getTheme: () => Promise<'light' | 'dark' | 'system'>;
    setTheme: (theme: 'light' | 'dark' | 'system') => Promise<void>;
}
declare global {
    interface Window {
        electronAPI: ElectronAPI;
    }
}
export {};
