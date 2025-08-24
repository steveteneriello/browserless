import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),

  // Browser Configuration
  browserTimeout: parseInt(process.env.BROWSER_TIMEOUT || '30000', 10), // 30 seconds for Railway
  maxConcurrentSessions: parseInt(process.env.MAX_CONCURRENT_SESSIONS || '3', 10), // Lower for Railway
  maxJobsPerBrowser: parseInt(process.env.MAX_JOBS_PER_BROWSER || '5', 10), // Lower for Railway
  browserIdleTimeout: parseInt(process.env.BROWSER_IDLE_TIMEOUT || '120000', 10), // 2 minutes
  maxRequestsPerInstance: parseInt(process.env.MAX_REQUESTS_PER_INSTANCE || '50', 10),
  
  // Enhanced browser arguments for production stability
  browserArgs: process.env.BROWSER_ARGS?.split(',') || [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--disable-gpu',
    '--disable-web-security',
    '--disable-features=VizDisplayCompositor',
    '--max-old-space-size=512',
    '--memory-pressure-off',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    '--disable-ipc-flooding-protection',
    '--disable-extensions',
    '--disable-plugins',
    '--virtual-time-budget=10000',
    '--run-all-compositor-stages-before-draw',
    '--disable-new-content-rendering-timeout'
  ],

  // Memory Management (optimized for Railway)
  maxMemoryPerBrowser: parseInt(process.env.MAX_MEMORY_PER_BROWSER || '268435456', 10), // 256MB
  memoryWarningThreshold: parseFloat(process.env.MEMORY_WARNING_THRESHOLD || '0.7'), // 70%
  memoryCriticalThreshold: parseFloat(process.env.MEMORY_CRITICAL_THRESHOLD || '0.85'), // 85%
  garbageCollectionInterval: parseInt(process.env.GARBAGE_COLLECTION_INTERVAL || '15000', 10), // 15 seconds

  // Viewport Configuration
  defaultWidth: parseInt(process.env.DEFAULT_WIDTH || '1440', 10),
  defaultHeight: parseInt(process.env.DEFAULT_HEIGHT || '2400', 10),
  maxViewportWidth: parseInt(process.env.MAX_VIEWPORT_WIDTH || '3840', 10),
  maxViewportHeight: parseInt(process.env.MAX_VIEWPORT_HEIGHT || '2160', 10),

  // Redis
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',

  // Queue Management
  queueConcurrency: parseInt(process.env.QUEUE_CONCURRENCY || '5', 10),
  queueMaxJobs: parseInt(process.env.QUEUE_MAX_JOBS || '1000', 10),
  maxBatchSize: parseInt(process.env.MAX_BATCH_SIZE || '10', 10),
  maxConcurrentRequests: parseInt(process.env.MAX_CONCURRENT_REQUESTS || '50', 10),

  // Rate Limiting
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),

  // Security
  apiKey: process.env.API_KEY || process.env.TOKEN || 'default-api-key',
  token: process.env.TOKEN || process.env.API_KEY || 'default-api-key',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  allowedDomains: process.env.ALLOWED_DOMAINS?.split(',') || ['*'],
  blockedDomains: process.env.BLOCKED_DOMAINS?.split(',') || [
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    '::1',
    'internal',
    'local'
  ],

  // File Handling
  uploadDir: process.env.UPLOAD_DIR || './uploads/',
  outputDir: process.env.OUTPUT_DIR || './outputs/',
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800', 10), // 50MB
  tempFileTtl: parseInt(process.env.TEMP_FILE_TTL || '3600000', 10), // 1 hour

  // Monitoring
  enableMetrics: process.env.ENABLE_METRICS === 'true',
  metricsPort: parseInt(process.env.METRICS_PORT || '9090', 10),

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',

  // Health Checks
  healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000', 10), // 30 seconds

  // Circuit Breaker
  circuitBreaker: {
    failureThreshold: parseInt(process.env.CIRCUIT_BREAKER_FAILURE_THRESHOLD || '5', 10),
    successThreshold: parseInt(process.env.CIRCUIT_BREAKER_SUCCESS_THRESHOLD || '3', 10),
    timeout: parseInt(process.env.CIRCUIT_BREAKER_TIMEOUT || '60000', 10), // 1 minute
    halfOpenMaxCalls: parseInt(process.env.CIRCUIT_BREAKER_HALF_OPEN_MAX_CALLS || '3', 10),
    recoveryTimeout: parseInt(process.env.CIRCUIT_BREAKER_RECOVERY_TIMEOUT || '120000', 10), // 2 minutes
  },

  // Auto-scaling (for future implementation)
  autoScaling: {
    enabled: process.env.AUTO_SCALING_ENABLED === 'true',
    minReplicas: parseInt(process.env.AUTO_SCALING_MIN_REPLICAS || '2', 10),
    maxReplicas: parseInt(process.env.AUTO_SCALING_MAX_REPLICAS || '10', 10),
    targetCpuUtilization: parseInt(process.env.AUTO_SCALING_TARGET_CPU || '70', 10),
    targetMemoryUtilization: parseInt(process.env.AUTO_SCALING_TARGET_MEMORY || '80', 10),
  },

  // Multi-instance support
  instances: {
    primary: {
      url: process.env.BROWSER_WS_ENDPOINT || 'ws://localhost:3000',
      token: process.env.BROWSER_TOKEN || '',
      domain: process.env.BROWSER_DOMAIN || 'localhost',
    },
    secondary: process.env.BROWSERLESS_1_URL ? {
      url: process.env.BROWSERLESS_1_URL,
      token: process.env.BROWSERLESS_1_TOKEN || '',
      domain: process.env.BROWSERLESS_1_DOMAIN || '',
    } : null,
    tertiary: process.env.BROWSERLESS_2_URL ? {
      url: process.env.BROWSERLESS_2_URL,
      token: process.env.BROWSERLESS_2_TOKEN || '',
      domain: process.env.BROWSERLESS_2_DOMAIN || '',
    } : null,
  },
};
