import { BaseService, ServiceConfig } from './Service';
export declare class ExpressService extends BaseService {
    private app;
    private server;
    constructor(config: ServiceConfig);
    protected initialize(): Promise<void>;
    protected cleanup(): Promise<void>;
    protected checkHealth(): Promise<boolean>;
    private setupRoutes;
}
