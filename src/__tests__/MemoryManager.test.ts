import { MemoryManager } from '../utils/MemoryManager';

describe('MemoryManager', () => {
  let memoryManager: MemoryManager;

  beforeEach(() => {
    memoryManager = MemoryManager.getInstance();
  });

  describe('memory stats', () => {
    it('should return current memory statistics', () => {
      const stats = memoryManager.getMemoryStats();
      
      expect(stats).toHaveProperty('heapUsed');
      expect(stats).toHaveProperty('heapTotal');
      expect(stats).toHaveProperty('external');
      expect(stats).toHaveProperty('rss');
      expect(stats).toHaveProperty('usage');
      expect(stats).toHaveProperty('warning');
      expect(stats).toHaveProperty('critical');
      
      expect(typeof stats.heapUsed).toBe('number');
      expect(typeof stats.heapTotal).toBe('number');
      expect(typeof stats.usage).toBe('number');
      expect(typeof stats.warning).toBe('boolean');
      expect(typeof stats.critical).toBe('boolean');
      
      expect(stats.usage).toBeGreaterThanOrEqual(0);
      expect(stats.usage).toBeLessThanOrEqual(1);
    });

    it('should detect warning threshold', () => {
      // Mock process.memoryUsage to return high memory usage
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = jest.fn().mockReturnValue({
        heapUsed: 850 * 1024 * 1024, // 850MB
        heapTotal: 1000 * 1024 * 1024, // 1GB
        external: 50 * 1024 * 1024,
        rss: 900 * 1024 * 1024
      });

      const stats = memoryManager.getMemoryStats();
      expect(stats.warning).toBe(true);
      expect(stats.critical).toBe(false);

      // Restore original function
      process.memoryUsage = originalMemoryUsage;
    });

    it('should detect critical threshold', () => {
      // Mock process.memoryUsage to return critical memory usage
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = jest.fn().mockReturnValue({
        heapUsed: 950 * 1024 * 1024, // 950MB
        heapTotal: 1000 * 1024 * 1024, // 1GB
        external: 50 * 1024 * 1024,
        rss: 1000 * 1024 * 1024
      });

      const stats = memoryManager.getMemoryStats();
      expect(stats.warning).toBe(true);
      expect(stats.critical).toBe(true);

      // Restore original function
      process.memoryUsage = originalMemoryUsage;
    });
  });

  describe('monitoring', () => {
    it('should start and stop monitoring', () => {
      memoryManager.startMonitoring();
      memoryManager.stopMonitoring();
      
      // Should not throw errors
      expect(true).toBe(true);
    });
  });

  describe('pressure detection', () => {
    it('should detect memory pressure', () => {
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = jest.fn().mockReturnValue({
        heapUsed: 850 * 1024 * 1024,
        heapTotal: 1000 * 1024 * 1024,
        external: 50 * 1024 * 1024,
        rss: 900 * 1024 * 1024
      });

      expect(memoryManager.isMemoryPressure()).toBe(true);
      expect(memoryManager.isMemoryCritical()).toBe(false);

      process.memoryUsage = originalMemoryUsage;
    });

    it('should detect critical memory', () => {
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = jest.fn().mockReturnValue({
        heapUsed: 950 * 1024 * 1024,
        heapTotal: 1000 * 1024 * 1024,
        external: 50 * 1024 * 1024,
        rss: 1000 * 1024 * 1024
      });

      expect(memoryManager.isMemoryPressure()).toBe(true);
      expect(memoryManager.isMemoryCritical()).toBe(true);

      process.memoryUsage = originalMemoryUsage;
    });
  });

  describe('garbage collection', () => {
    it('should handle garbage collection gracefully', () => {
      // Test when global.gc is not available
      const originalGc = global.gc;
      delete (global as any).gc;

      expect(() => memoryManager.forceGarbageCollection()).not.toThrow();

      // Test when global.gc is available
      (global as any).gc = jest.fn();
      memoryManager.forceGarbageCollection();
      expect(global.gc).toHaveBeenCalled();

      // Restore
      if (originalGc) {
        global.gc = originalGc;
      } else {
        delete (global as any).gc;
      }
    });
  });
});
