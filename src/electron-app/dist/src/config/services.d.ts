export declare const SERVICE_CONFIG: {
    readonly ollama: {
        readonly basePath: string;
        readonly modelsPath: string;
        readonly configPath: string;
        readonly defaultModel: "llama2";
        readonly apiEndpoint: "http://localhost:11434";
        readonly timeout: 30000;
        readonly maxRetries: 3;
        readonly retryDelay: 1000;
        readonly healthCheckInterval: 5000;
    };
    readonly chroma: {
        readonly dataPath: string;
        readonly collectionName: "documents";
        readonly embeddingDimension: 1536;
        readonly apiEndpoint: "http://localhost:8000";
        readonly timeout: 30000;
        readonly healthCheckInterval: 5000;
    };
    readonly app: {
        readonly userData: string;
        readonly logs: string;
        readonly temp: string;
        readonly cache: string;
    };
    readonly status: {
        readonly checkInterval: 5000;
        readonly timeout: 5000;
        readonly maxRetries: 3;
    };
};
export type ServiceConfig = typeof SERVICE_CONFIG;
export declare const getServicePath: (service: keyof typeof SERVICE_CONFIG) => string;
export declare const ensureServiceDirectories: () => void;
export declare const HEALTH_CHECK_CONFIG: {
    readonly ollama: {
        readonly endpoint: "http://localhost:11434/api/health";
        readonly timeout: 30000;
    };
    readonly chroma: {
        readonly endpoint: "http://localhost:8000/api/v1/heartbeat";
        readonly timeout: 30000;
    };
};
export type ServiceHealthCheckConfig = typeof HEALTH_CHECK_CONFIG;
export type ServiceStatus = 'unknown' | 'running' | 'error' | 'stopped' | 'restarting' | 'stopping';
export interface ServiceStatusInfo {
    status: ServiceStatus;
    error?: string;
    lastUpdated: string;
    details?: Record<string, any>;
}
