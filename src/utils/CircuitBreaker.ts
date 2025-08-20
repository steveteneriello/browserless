import { EventEmitter } from 'events';
import { logger } from '../utils/logger';

export interface CircuitBreakerOptions {
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
  halfOpenMaxCalls: number;
  recoveryTimeout: number;
}

export enum CircuitBreakerState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

export class CircuitBreaker extends EventEmitter {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime: number | null = null;
  private halfOpenCallCount = 0;
  private nextAttempt = Date.now();

  constructor(private options: CircuitBreakerOptions) {
    super();
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitBreakerState.OPEN) {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN');
      }
      this.state = CircuitBreakerState.HALF_OPEN;
      this.halfOpenCallCount = 0;
      this.emit('halfOpen');
    }

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      if (this.halfOpenCallCount >= this.options.halfOpenMaxCalls) {
        throw new Error('Circuit breaker HALF_OPEN call limit exceeded');
      }
      this.halfOpenCallCount++;
    }

    try {
      const result = await Promise.race([
        operation(),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Operation timeout')), this.options.timeout)
        )
      ]);

      this.onSuccess();
      return result;

    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.options.successThreshold) {
        this.state = CircuitBreakerState.CLOSED;
        this.successCount = 0;
        this.halfOpenCallCount = 0;
        this.emit('closed');
        logger.info('Circuit breaker closed');
      }
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.state = CircuitBreakerState.OPEN;
      this.nextAttempt = Date.now() + this.options.recoveryTimeout;
      this.emit('opened');
      logger.warn('Circuit breaker opened from half-open state');
      return;
    }

    if (this.failureCount >= this.options.failureThreshold) {
      this.state = CircuitBreakerState.OPEN;
      this.nextAttempt = Date.now() + this.options.recoveryTimeout;
      this.emit('opened');
      logger.warn(`Circuit breaker opened after ${this.failureCount} failures`);
    }
  }

  getState(): CircuitBreakerState {
    return this.state;
  }

  getStats() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      halfOpenCallCount: this.halfOpenCallCount,
      nextAttempt: this.nextAttempt
    };
  }

  reset(): void {
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.halfOpenCallCount = 0;
    this.nextAttempt = Date.now();
    this.emit('reset');
    logger.info('Circuit breaker reset');
  }
}
