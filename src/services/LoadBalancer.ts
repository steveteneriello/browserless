import { logger } from '../utils/logger';
import { CircuitBreaker, CircuitBreakerState } from '../utils/CircuitBreaker';
import { config } from '../config';

export interface BrowserlessInstance {
  id: string;
  url: string;
  token: string;
  domain: string;
  isHealthy: boolean;
  currentLoad: number;
  maxLoad: number;
  lastHealthCheck: Date;
  responseTime: number;
  errorCount: number;
  successCount: number;
}

export interface LoadBalancerConfig {
  healthCheckInterval: number;
  maxRetries: number;
  timeout: number;
  strategy: 'round_robin' | 'least_connections' | 'weighted' | 'health_based';
}

export class LoadBalancer {
  private instances: Map<string, BrowserlessInstance> = new Map();
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private currentRoundRobinIndex = 0;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private readonly config: LoadBalancerConfig;

  constructor(config?: Partial<LoadBalancerConfig>) {
    this.config = {
      healthCheckInterval: 30000, // 30 seconds
      maxRetries: 3,
      timeout: 30000, // 30 seconds
      strategy: 'health_based',
      ...config
    };

    this.initializeInstances();
    this.startHealthChecks();
  }

  private initializeInstances(): void {
    // Primary instance
    if (process.env.BROWSER_WS_ENDPOINT) {
      this.addInstance({
        id: 'primary',
        url: process.env.BROWSER_WS_ENDPOINT,
        token: process.env.BROWSER_TOKEN || '',
        domain: process.env.BROWSER_DOMAIN || '',
        isHealthy: true,
        currentLoad: 0,
        maxLoad: 10,
        lastHealthCheck: new Date(),
        responseTime: 0,
        errorCount: 0,
        successCount: 0
      });
    }

    // Secondary instances
    for (let i = 1; i <= 3; i++) {
      const url = process.env[`BROWSERLESS_${i}_URL`];
      const token = process.env[`BROWSERLESS_${i}_TOKEN`];
      const domain = process.env[`BROWSERLESS_${i}_DOMAIN`];

      if (url && token) {
        this.addInstance({
          id: `secondary-${i}`,
          url,
          token,
          domain: domain || '',
          isHealthy: true,
          currentLoad: 0,
          maxLoad: 10,
          lastHealthCheck: new Date(),
          responseTime: 0,
          errorCount: 0,
          successCount: 0
        });
      }
    }

    logger.info(`Initialized ${this.instances.size} browserless instances`);
  }

  private addInstance(instance: BrowserlessInstance): void {
    this.instances.set(instance.id, instance);
    
    // Create circuit breaker for this instance
    this.circuitBreakers.set(instance.id, new CircuitBreaker({
      failureThreshold: 5,
      successThreshold: 3,
      timeout: this.config.timeout,
      halfOpenMaxCalls: 3,
      recoveryTimeout: 120000 // 2 minutes
    }));

    logger.info(`Added browserless instance: ${instance.id}`);
  }

  async getAvailableInstance(): Promise<BrowserlessInstance> {
    const healthyInstances = Array.from(this.instances.values()).filter(
      instance => this.isInstanceAvailable(instance)
    );

    if (healthyInstances.length === 0) {
      throw new Error('No healthy browserless instances available');
    }

    switch (this.config.strategy) {
      case 'round_robin':
        return this.getRoundRobinInstance(healthyInstances);
      case 'least_connections':
        return this.getLeastConnectionsInstance(healthyInstances);
      case 'weighted':
        return this.getWeightedInstance(healthyInstances);
      case 'health_based':
      default:
        return this.getHealthBasedInstance(healthyInstances);
    }
  }

  private isInstanceAvailable(instance: BrowserlessInstance): boolean {
    const circuitBreaker = this.circuitBreakers.get(instance.id);
    return (
      instance.isHealthy &&
      instance.currentLoad < instance.maxLoad &&
      circuitBreaker?.getState() !== CircuitBreakerState.OPEN
    );
  }

  private getRoundRobinInstance(instances: BrowserlessInstance[]): BrowserlessInstance {
    if (instances.length === 0) {
      throw new Error('No instances available for round robin');
    }
    const instance = instances[this.currentRoundRobinIndex % instances.length];
    this.currentRoundRobinIndex++;
    return instance;
  }

  private getLeastConnectionsInstance(instances: BrowserlessInstance[]): BrowserlessInstance {
    return instances.reduce((least, current) =>
      current.currentLoad < least.currentLoad ? current : least
    );
  }

  private getWeightedInstance(instances: BrowserlessInstance[]): BrowserlessInstance {
    if (instances.length === 0) {
      throw new Error('No instances available for weighted selection');
    }
    
    // Weight based on inverse of current load and response time
    const weights = instances.map(instance => {
      const loadWeight = (instance.maxLoad - instance.currentLoad) / instance.maxLoad;
      const responseWeight = instance.responseTime > 0 ? 1000 / instance.responseTime : 1;
      return loadWeight * responseWeight;
    });

    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    if (totalWeight === 0) {
      return instances[0];
    }

    const random = Math.random() * totalWeight;
    let currentWeight = 0;
    
    for (let i = 0; i < instances.length; i++) {
      const weight = weights[i];
      if (weight !== undefined) {
        currentWeight += weight;
        if (random <= currentWeight) {
          return instances[i]!;
        }
      }
    }

    return instances[0]; // Fallback
  }

  private getHealthBasedInstance(instances: BrowserlessInstance[]): BrowserlessInstance {
    if (instances.length === 0) {
      throw new Error('No instances available for health-based selection');
    }
    
    // Score based on health, load, and performance
    const scored = instances.map(instance => {
      const healthScore = instance.isHealthy ? 1 : 0;
      const loadScore = (instance.maxLoad - instance.currentLoad) / instance.maxLoad;
      const performanceScore = instance.successCount / Math.max(instance.successCount + instance.errorCount, 1);
      const responseScore = instance.responseTime > 0 ? Math.min(1000 / instance.responseTime, 1) : 1;
      
      const totalScore = (healthScore * 0.4) + (loadScore * 0.3) + (performanceScore * 0.2) + (responseScore * 0.1);
      
      return { instance, score: totalScore };
    });

    scored.sort((a, b) => b.score - a.score);
    
    if (scored.length === 0 || !scored[0]) {
      throw new Error('No scored instances available');
    }
    
    return scored[0].instance;
  }

  async executeWithInstance<T>(
    operation: (instance: BrowserlessInstance) => Promise<T>
  ): Promise<T> {
    const instance = await this.getAvailableInstance();
    const circuitBreaker = this.circuitBreakers.get(instance.id)!;

    instance.currentLoad++;
    const startTime = Date.now();

    try {
      const result = await circuitBreaker.execute(() => operation(instance));
      
      instance.successCount++;
      instance.responseTime = Date.now() - startTime;
      
      return result;
    } catch (error) {
      instance.errorCount++;
      throw error;
    } finally {
      instance.currentLoad--;
    }
  }

  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(
      () => this.performHealthChecks(),
      this.config.healthCheckInterval
    );
  }

  private async performHealthChecks(): Promise<void> {
    const healthCheckPromises = Array.from(this.instances.values()).map(
      instance => this.checkInstanceHealth(instance)
    );

    await Promise.allSettled(healthCheckPromises);
  }

  private async checkInstanceHealth(instance: BrowserlessInstance): Promise<void> {
    try {
      const startTime = Date.now();
      
      // Simple health check - could be expanded to actual HTTP request
      const isHealthy = await this.pingInstance(instance);
      
      instance.isHealthy = isHealthy;
      instance.lastHealthCheck = new Date();
      instance.responseTime = Date.now() - startTime;

      if (isHealthy) {
        logger.debug(`Health check passed for instance ${instance.id}`);
      } else {
        logger.warn(`Health check failed for instance ${instance.id}`);
      }
    } catch (error) {
      instance.isHealthy = false;
      instance.errorCount++;
      logger.error(`Health check error for instance ${instance.id}:`, error);
    }
  }

  private async pingInstance(instance: BrowserlessInstance): Promise<boolean> {
    // Simplified health check - in real implementation, make HTTP request to health endpoint
    return new Promise((resolve) => {
      setTimeout(() => {
        // Simulate health check based on error rate
        const errorRate = instance.errorCount / Math.max(instance.successCount + instance.errorCount, 1);
        resolve(errorRate < 0.2); // Healthy if error rate < 20%
      }, 100);
    });
  }

  getStats() {
    const instances = Array.from(this.instances.values());
    
    return {
      totalInstances: instances.length,
      healthyInstances: instances.filter(i => i.isHealthy).length,
      totalLoad: instances.reduce((sum, i) => sum + i.currentLoad, 0),
      averageResponseTime: instances.reduce((sum, i) => sum + i.responseTime, 0) / instances.length,
      circuitBreakerStates: Object.fromEntries(
        Array.from(this.circuitBreakers.entries()).map(([id, cb]) => [id, cb.getState()])
      ),
      instances: instances.map(i => ({
        id: i.id,
        isHealthy: i.isHealthy,
        currentLoad: i.currentLoad,
        maxLoad: i.maxLoad,
        responseTime: i.responseTime,
        errorCount: i.errorCount,
        successCount: i.successCount
      }))
    };
  }

  stop(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    logger.info('Load balancer stopped');
  }
}
