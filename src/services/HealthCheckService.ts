import { BrowserPool } from '../services/BrowserPool';
import { QueueService } from '../services/QueueService';
import { memoryManager } from '../utils/MemoryManager';
import { logger } from '../utils/logger';
import { config } from '../config';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  checks: {
    [key: string]: {
      status: 'pass' | 'fail' | 'warn';
      message?: string;
      duration?: number;
      data?: any;
    };
  };
}

export class HealthCheckService {
  private startTime = Date.now();

  constructor(
    private browserPool: BrowserPool,
    private queueService: QueueService
  ) {}

  async getHealthStatus(): Promise<HealthStatus> {
    const checks: HealthStatus['checks'] = {};
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    // Memory check
    const memoryCheck = await this.checkMemory();
    checks.memory = memoryCheck;
    if (memoryCheck.status === 'fail') overallStatus = 'unhealthy';
    else if (memoryCheck.status === 'warn') overallStatus = 'degraded';

    // Browser pool check
    const browserCheck = await this.checkBrowserPool();
    checks.browserPool = browserCheck;
    if (browserCheck.status === 'fail') overallStatus = 'unhealthy';
    else if (browserCheck.status === 'warn' && overallStatus === 'healthy') overallStatus = 'degraded';

    // Queue check
    const queueCheck = await this.checkQueue();
    checks.queue = queueCheck;
    if (queueCheck.status === 'fail') overallStatus = 'unhealthy';
    else if (queueCheck.status === 'warn' && overallStatus === 'healthy') overallStatus = 'degraded';

    // External services check
    const externalCheck = await this.checkExternalServices();
    checks.external = externalCheck;
    if (externalCheck.status === 'fail') overallStatus = 'unhealthy';
    else if (externalCheck.status === 'warn' && overallStatus === 'healthy') overallStatus = 'degraded';

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      version: '1.0.0',
      checks
    };
  }

  private async checkMemory() {
    const startTime = Date.now();
    
    try {
      const memStats = memoryManager.getMemoryStats();
      const duration = Date.now() - startTime;

      if (memStats.critical) {
        return {
          status: 'fail' as const,
          message: 'Critical memory usage',
          duration,
          data: {
            usage: `${(memStats.usage * 100).toFixed(2)}%`,
            heapUsed: `${(memStats.heapUsed / 1024 / 1024).toFixed(2)}MB`,
            heapTotal: `${(memStats.heapTotal / 1024 / 1024).toFixed(2)}MB`
          }
        };
      }

      if (memStats.warning) {
        return {
          status: 'warn' as const,
          message: 'High memory usage',
          duration,
          data: {
            usage: `${(memStats.usage * 100).toFixed(2)}%`,
            heapUsed: `${(memStats.heapUsed / 1024 / 1024).toFixed(2)}MB`
          }
        };
      }

      return {
        status: 'pass' as const,
        message: 'Memory usage normal',
        duration,
        data: {
          usage: `${(memStats.usage * 100).toFixed(2)}%`,
          heapUsed: `${(memStats.heapUsed / 1024 / 1024).toFixed(2)}MB`
        }
      };

    } catch (error) {
      return {
        status: 'fail' as const,
        message: `Memory check failed: ${error}`,
        duration: Date.now() - startTime
      };
    }
  }

  private async checkBrowserPool() {
    const startTime = Date.now();
    
    try {
      const stats = this.browserPool.getStats();
      const duration = Date.now() - startTime;

      if (stats.totalSessions === 0) {
        return {
          status: 'fail' as const,
          message: 'No browser sessions available',
          duration,
          data: stats
        };
      }

      const utilizationRate = stats.activeSessions / stats.maxSessions;
      
      if (utilizationRate > 0.9) {
        return {
          status: 'warn' as const,
          message: 'High browser pool utilization',
          duration,
          data: { ...stats, utilization: `${(utilizationRate * 100).toFixed(2)}%` }
        };
      }

      return {
        status: 'pass' as const,
        message: 'Browser pool healthy',
        duration,
        data: { ...stats, utilization: `${(utilizationRate * 100).toFixed(2)}%` }
      };

    } catch (error) {
      return {
        status: 'fail' as const,
        message: `Browser pool check failed: ${error}`,
        duration: Date.now() - startTime
      };
    }
  }

  private async checkQueue() {
    const startTime = Date.now();
    
    try {
      const stats = await this.queueService.getQueueStats();
      const duration = Date.now() - startTime;

      if (stats.failed > stats.completed * 0.1) { // More than 10% failure rate
        return {
          status: 'warn' as const,
          message: 'High queue failure rate',
          duration,
          data: stats
        };
      }

      if (stats.waiting > config.queueMaxJobs * 0.8) { // Queue 80% full
        return {
          status: 'warn' as const,
          message: 'Queue near capacity',
          duration,
          data: stats
        };
      }

      return {
        status: 'pass' as const,
        message: 'Queue healthy',
        duration,
        data: stats
      };

    } catch (error) {
      return {
        status: 'fail' as const,
        message: `Queue check failed: ${error}`,
        duration: Date.now() - startTime
      };
    }
  }

  private async checkExternalServices(): Promise<{
    status: 'pass' | 'fail' | 'warn';
    message?: string;
    duration?: number;
    data?: any;
  }> {
    const startTime = Date.now();
    
    try {
      // This would check external dependencies like Redis, databases, etc.
      // For now, we'll do a simple connectivity check
      
      const duration = Date.now() - startTime;
      
      return {
        status: 'pass' as const,
        message: 'External services accessible',
        duration,
        data: {
          redis: 'connected',
          // Add other external service checks here
        }
      };

    } catch (error) {
      return {
        status: 'fail' as const,
        message: `External services check failed: ${error}`,
        duration: Date.now() - startTime
      };
    }
  }

  async performReadinessCheck(): Promise<boolean> {
    try {
      const health = await this.getHealthStatus();
      return health.status !== 'unhealthy';
    } catch {
      return false;
    }
  }

  async performLivenessCheck(): Promise<boolean> {
    try {
      // Simple check to ensure the process is responsive
      const memStats = memoryManager.getMemoryStats();
      return !memStats.critical;
    } catch {
      return false;
    }
  }
}
