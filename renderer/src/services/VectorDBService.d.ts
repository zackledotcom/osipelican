import { BaseService, ServiceConfig } from './Service';
export declare class VectorDBService extends BaseService {
    constructor(config: ServiceConfig);
    protected initialize(): Promise<void>;
    protected cleanup(): Promise<void>;
    protected checkHealth(): Promise<boolean>;
}
