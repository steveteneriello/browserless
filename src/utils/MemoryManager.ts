import { logger } from '../utils/logger';
import { config } from '../config';

export interface MemoryStats {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  usage: number;
  warning: boolean;
  critical: boolean;
}

export class MemoryManager {
  private static instance: MemoryManager;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isShuttingDown = false;

  private constructor() {}

  static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  startMonitoring(): void {
    if (this.monitoringInterval) {
      return;
    }

    this.monitoringInterval = setInterval(() => {
      this.checkMemoryUsage();
    }, config.healthCheckInterval);

    logger.info('Memory monitoring started');
  }

  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      logger.info('Memory monitoring stopped');
    }
  }

  getMemoryStats(): MemoryStats {
    const memUsage = process.memoryUsage();
    const usage = memUsage.heapUsed / memUsage.heapTotal;
    
    return {
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      rss: memUsage.rss,
      usage,
      warning: usage > 0.8,
      critical: usage > 0.9
    };
  }

  private checkMemoryUsage(): void {
    if (this.isShuttingDown) {
      return;
    }

    const stats = this.getMemoryStats();

    if (stats.critical) {
      logger.error('Critical memory usage detected', {
        usage: `${(stats.usage * 100).toFixed(2)}%`,
        heapUsed: `${(stats.heapUsed / 1024 / 1024).toFixed(2)}MB`,
        heapTotal: `${(stats.heapTotal / 1024 / 1024).toFixed(2)}MB`
      });

      // Force garbage collection if available
      if (global.gc) {
        logger.info('Forcing garbage collection...');
        global.gc();
      }

      // If still critical after GC, initiate graceful shutdown
      setTimeout(() => {
        const newStats = this.getMemoryStats();
        if (newStats.critical && !this.isShuttingDown) {
          logger.error('Memory usage still critical after GC, initiating shutdown');
          this.initiateGracefulShutdown();
        }
      }, 5000);

    } else if (stats.warning) {
      logger.warn('High memory usage detected', {
        usage: `${(stats.usage * 100).toFixed(2)}%`,
        heapUsed: `${(stats.heapUsed / 1024 / 1024).toFixed(2)}MB`
      });

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
    }
  }

  forceGarbageCollection(): void {
    if (global.gc) {
      logger.info('Manual garbage collection triggered');
      global.gc();
    } else {
      logger.warn('Garbage collection not available (run with --expose-gc)');
    }
  }

  private initiateGracefulShutdown(): void {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;
    logger.error('Initiating graceful shutdown due to memory pressure');

    // Stop accepting new requests
    process.emit('SIGTERM');

    // Force shutdown after timeout
    setTimeout(() => {
      logger.error('Force shutdown due to memory pressure');
      process.exit(1);
    }, 30000);
  }

  isMemoryPressure(): boolean {
    const stats = this.getMemoryStats();
    return stats.warning;
  }

  isMemoryCritical(): boolean {
    const stats = this.getMemoryStats();
    return stats.critical;
  }
}

// Global memory manager instance
export const memoryManager = MemoryManager.getInstance();
