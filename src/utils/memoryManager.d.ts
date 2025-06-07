interface MemoryStats {
    heapTotal: number;
    heapUsed: number;
    external: number;
    rss: number;
    arrayBuffers: number;
    heapTotalMB: string;
    heapUsedMB: string;
    externalMB: string;
    rssMB: string;
    arrayBuffersMB: string;
    heapUsedPercentage: string;
}
export declare class MemoryManager {
    private static instance;
    private monitoringInterval;
    private gcInterval;
    private lastGcTime;
    private readonly gcCooldown;
    private readonly thresholds;
    private constructor();
    static getInstance(): MemoryManager;
    initialize(): Promise<void>;
    private startMonitoring;
    private startPeriodicGC;
    private getMemoryStats;
    private analyzeMemoryUsage;
    private shouldRunGC;
    private runGC;
    getCurrentStats(): MemoryStats;
    cleanup(): void;
}
export {};
