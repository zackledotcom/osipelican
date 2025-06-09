"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryManager = void 0;
const electron_1 = require("electron");
const logger_1 = require("../utils/logger");
class MemoryManager {
    constructor() {
        this.monitoringInterval = null;
        this.gcInterval = null;
        this.lastGcTime = 0;
        this.gcCooldown = 60000; // 1 minute between GC attempts
        this.thresholds = {
            warning: 75, // 75% heap usage triggers warning
            critical: 90, // 90% heap usage triggers critical
            maxHeapSize: 4096, // 4GB max heap size
        };
        // Private constructor for singleton
    }
    static getInstance() {
        if (!MemoryManager.instance) {
            MemoryManager.instance = new MemoryManager();
        }
        return MemoryManager.instance;
    }
    async initialize() {
        // Configure V8 heap limit
        const v8HeapLimit = this.thresholds.maxHeapSize;
        if (process.platform === 'darwin') {
            electron_1.app.commandLine.appendSwitch('js-flags', `--max-old-space-size=${v8HeapLimit}`);
        }
        else {
            process.env.NODE_OPTIONS = `--max-old-space-size=${v8HeapLimit}`;
        }
        logger_1.logger.info(`Memory Manager initialized with ${v8HeapLimit}MB heap limit`);
        // Start monitoring
        this.startMonitoring();
        // Start periodic GC
        this.startPeriodicGC();
    }
    startMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }
        this.monitoringInterval = setInterval(() => {
            const stats = this.getMemoryStats();
            this.analyzeMemoryUsage(stats);
        }, 30000); // Check every 30 seconds
    }
    startPeriodicGC() {
        if (this.gcInterval) {
            clearInterval(this.gcInterval);
        }
        this.gcInterval = setInterval(() => {
            const stats = this.getMemoryStats();
            if (this.shouldRunGC(stats)) {
                this.runGC();
            }
        }, 300000); // Check every 5 minutes
    }
    getMemoryStats() {
        const used = process.memoryUsage();
        const heapUsedPercentage = (used.heapUsed / used.heapTotal) * 100;
        return {
            heapTotal: used.heapTotal,
            heapUsed: used.heapUsed,
            external: used.external,
            rss: used.rss,
            arrayBuffers: used.arrayBuffers,
            heapTotalMB: `${Math.round(used.heapTotal / 1024 / 1024)}MB`,
            heapUsedMB: `${Math.round(used.heapUsed / 1024 / 1024)}MB`,
            externalMB: `${Math.round(used.external / 1024 / 1024)}MB`,
            rssMB: `${Math.round(used.rss / 1024 / 1024)}MB`,
            arrayBuffersMB: `${Math.round(used.arrayBuffers / 1024 / 1024)}MB`,
            heapUsedPercentage: `${heapUsedPercentage.toFixed(2)}%`,
        };
    }
    analyzeMemoryUsage(stats) {
        const heapUsedPercentage = (stats.heapUsed / stats.heapTotal) * 100;
        if (heapUsedPercentage >= this.thresholds.critical) {
            logger_1.logger.warn('CRITICAL: High memory usage detected', {
                ...stats,
                action: 'Triggering emergency garbage collection',
            });
            this.runGC();
        }
        else if (heapUsedPercentage >= this.thresholds.warning) {
            logger_1.logger.warn('WARNING: Elevated memory usage', stats);
        }
        else {
            logger_1.logger.debug('Memory usage normal', stats);
        }
    }
    shouldRunGC(stats) {
        const now = Date.now();
        const heapUsedPercentage = (stats.heapUsed / stats.heapTotal) * 100;
        return (now - this.lastGcTime > this.gcCooldown &&
            heapUsedPercentage > this.thresholds.warning);
    }
    runGC() {
        try {
            if (global.gc) {
                const beforeStats = this.getMemoryStats();
                global.gc();
                const afterStats = this.getMemoryStats();
                const freedMemory = beforeStats.heapUsed - afterStats.heapUsed;
                const freedMemoryMB = Math.round(freedMemory / 1024 / 1024);
                logger_1.logger.info('Garbage collection completed', {
                    freedMemory: `${freedMemoryMB}MB`,
                    before: beforeStats,
                    after: afterStats,
                });
                this.lastGcTime = Date.now();
            }
            else {
                logger_1.logger.warn('Garbage collection not available. Run with --expose-gc flag');
            }
        }
        catch (error) {
            logger_1.logger.error('Error during garbage collection:', error);
        }
    }
    getCurrentStats() {
        return this.getMemoryStats();
    }
    cleanup() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        if (this.gcInterval) {
            clearInterval(this.gcInterval);
            this.gcInterval = null;
        }
    }
}
exports.MemoryManager = MemoryManager;
// # sourceMappingURL=memoryManager.js.map 