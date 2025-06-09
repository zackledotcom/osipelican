import { EventEmitter } from 'events';
import { Service, ServiceStatus, ServiceMetrics } from './Service';
export interface ServiceManagerEvents {
    'service:status': (serviceName: string, status: ServiceStatus) => void;
    'service:error': (serviceName: string, error: Error) => void;
    'service:metrics': (serviceName: string, metrics: ServiceMetrics) => void;
    'service:log': (serviceName: string, message: string, level: string) => void;
}
export declare class ServiceManager extends EventEmitter {
    private static instance;
    private services;
    private serviceConfigs;
    private errorHandler;
    private metricsInterval?;
    private environment;
    private constructor();
    static getInstance(): ServiceManager;
    private setupServiceRegistry;
    private registerServiceConfig;
    initialize(): Promise<void>;
    private getServicesToStart;
    private startService;
    private createService;
    private setupServiceEventListeners;
    stopService(serviceName: string): Promise<void>;
    restartService(serviceName: string): Promise<void>;
    getService<T extends Service>(serviceName: string): T | undefined;
    getServiceStatus(serviceName: string): ServiceStatus | undefined;
    getAllServiceStatus(): Map<string, ServiceStatus>;
    cleanup(): Promise<void>;
    private buildServiceGraph;
    private getServiceStopOrder;
    private startMetricsCollection;
    private stopMetricsCollection;
}
