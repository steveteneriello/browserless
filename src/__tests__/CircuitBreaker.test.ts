import { CircuitBreaker, CircuitBreakerState } from '../src/utils/CircuitBreaker';

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker;

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker({
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 5000,
      halfOpenMaxCalls: 2,
      recoveryTimeout: 10000
    });
  });

  describe('CLOSED state', () => {
    it('should execute operations successfully', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      
      const result = await circuitBreaker.execute(operation);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
      expect(circuitBreaker.getState()).toBe(CircuitBreakerState.CLOSED);
    });

    it('should transition to OPEN after failure threshold', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('failure'));
      
      // Execute 3 failing operations
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(operation);
        } catch (error) {
          // Expected to fail
        }
      }
      
      expect(circuitBreaker.getState()).toBe(CircuitBreakerState.OPEN);
    });
  });

  describe('OPEN state', () => {
    beforeEach(async () => {
      const failingOperation = jest.fn().mockRejectedValue(new Error('failure'));
      
      // Trip the circuit breaker
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(failingOperation);
        } catch (error) {
          // Expected to fail
        }
      }
    });

    it('should reject operations immediately', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      
      await expect(circuitBreaker.execute(operation)).rejects.toThrow('Circuit breaker is OPEN');
      expect(operation).not.toHaveBeenCalled();
    });

    it('should transition to HALF_OPEN after recovery timeout', async () => {
      // Mock Date.now to simulate time passing
      const originalNow = Date.now;
      Date.now = jest.fn(() => originalNow() + 15000); // 15 seconds later
      
      const operation = jest.fn().mockResolvedValue('success');
      
      await circuitBreaker.execute(operation);
      
      expect(circuitBreaker.getState()).toBe(CircuitBreakerState.HALF_OPEN);
      
      // Restore Date.now
      Date.now = originalNow;
    });
  });

  describe('HALF_OPEN state', () => {
    beforeEach(async () => {
      const failingOperation = jest.fn().mockRejectedValue(new Error('failure'));
      
      // Trip the circuit breaker
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(failingOperation);
        } catch (error) {
          // Expected to fail
        }
      }
      
      // Move to HALF_OPEN state
      const originalNow = Date.now;
      Date.now = jest.fn(() => originalNow() + 15000);
      
      const successOperation = jest.fn().mockResolvedValue('success');
      await circuitBreaker.execute(successOperation);
      
      Date.now = originalNow;
    });

    it('should transition to CLOSED after success threshold', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      
      // Execute one more successful operation (we already executed one)
      await circuitBreaker.execute(operation);
      
      expect(circuitBreaker.getState()).toBe(CircuitBreakerState.CLOSED);
    });

    it('should transition back to OPEN on failure', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('failure'));
      
      try {
        await circuitBreaker.execute(operation);
      } catch (error) {
        // Expected to fail
      }
      
      expect(circuitBreaker.getState()).toBe(CircuitBreakerState.OPEN);
    });
  });

  describe('timeout handling', () => {
    it('should timeout long-running operations', async () => {
      const longOperation = () => new Promise(resolve => setTimeout(resolve, 10000));
      
      await expect(circuitBreaker.execute(longOperation)).rejects.toThrow('Operation timeout');
    });
  });

  describe('stats and reset', () => {
    it('should provide accurate stats', () => {
      const stats = circuitBreaker.getStats();
      
      expect(stats).toHaveProperty('state');
      expect(stats).toHaveProperty('failureCount');
      expect(stats).toHaveProperty('successCount');
    });

    it('should reset state and counters', () => {
      circuitBreaker.reset();
      
      const stats = circuitBreaker.getStats();
      expect(stats.state).toBe(CircuitBreakerState.CLOSED);
      expect(stats.failureCount).toBe(0);
      expect(stats.successCount).toBe(0);
    });
  });
});
