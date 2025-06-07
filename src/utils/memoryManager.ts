import { app } from 'electron';
import { logger } from './logger';

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

interface MemoryThresholds {
  warning: number;  // Percentage
  critical: number; // Percentage
  maxHeapSize: number; // MB
}

export class MemoryManager {
  private static instance: MemoryManager;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private gcInterval: NodeJS.Timeout | null = null;
  private lastGcTime: number = 0;
  private readonly gcCooldown: number = 60000; // 1 minute between GC attempts

  private readonly thresholds: MemoryThresholds = {
    warning: 75,    // 75% heap usage triggers warning
    critical: 90,   // 90% heap usage triggers critical
    maxHeapSize: 4096, // 4GB max heap size
  };

  private constructor() {
    // Private constructor for singleton
  }

  static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  async initialize(): Promise<void> {
    // Configure V8 heap limit
    const v8HeapLimit = this.thresholds.maxHeapSize;
    if (process.platform === 'darwin') {
      app.commandLine.appendSwitch('js-flags', `--max-old-space-size=${v8HeapLimit}`);
    } else {
      process.env.NODE_OPTIONS = `--max-old-space-size=${v8HeapLimit}`;
    }

    logger.info(`Memory Manager initialized with ${v8HeapLimit}MB heap limit`);
    
    // Start monitoring
    this.startMonitoring();
    
    // Start periodic GC
    this.startPeriodicGC();
  }

  private startMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(() => {
      const stats = this.getMemoryStats();
      this.analyzeMemoryUsage(stats);
    }, 30000); // Check every 30 seconds
  }

  private startPeriodicGC(): void {
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

  private getMemoryStats(): MemoryStats {
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

  private analyzeMemoryUsage(stats: MemoryStats): void {
    const heapUsedPercentage = (stats.heapUsed / stats.heapTotal) * 100;

    if (heapUsedPercentage >= this.thresholds.critical) {
      logger.warn('CRITICAL: High memory usage detected', {
        ...stats,
        action: 'Triggering emergency garbage collection',
      });
      this.runGC();
    } else if (heapUsedPercentage >= this.thresholds.warning) {
      logger.warn('WARNING: Elevated memory usage', stats);
    } else {
      logger.debug('Memory usage normal', stats);
    }
  }

  private shouldRunGC(stats: MemoryStats): boolean {
    const now = Date.now();
    const heapUsedPercentage = (stats.heapUsed / stats.heapTotal) * 100;
    
    return (
      now - this.lastGcTime > this.gcCooldown &&
      heapUsedPercentage > this.thresholds.warning
    );
  }

  private runGC(): void {
    try {
      if (global.gc) {
        const beforeStats = this.getMemoryStats();
        global.gc();
        const afterStats = this.getMemoryStats();
        
        const freedMemory = beforeStats.heapUsed - afterStats.heapUsed;
        const freedMemoryMB = Math.round(freedMemory / 1024 / 1024);
        
        logger.info('Garbage collection completed', {
          freedMemory: `${freedMemoryMB}MB`,
          before: beforeStats,
          after: afterStats,
        });
        
        this.lastGcTime = Date.now();
      } else {
        logger.warn('Garbage collection not available. Run with --expose-gc flag');
      }
    } catch (error) {
      logger.error('Error during garbage collection:', error);
    }
  }

  getCurrentStats(): MemoryStats {
    return this.getMemoryStats();
  }

  cleanup(): void {
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