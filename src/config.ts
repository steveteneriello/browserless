import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10), // Railway will set PORT automatically

  // Browser Configuration (optimized for Railway)
  browserTimeout: parseInt(process.env.BROWSER_TIMEOUT || '45000', 10), // Reduced to 45 seconds
  maxConcurrentSessions: parseInt(process.env.MAX_CONCURRENT_SESSIONS || '1', 10), // Only 1 for Railway
  maxJobsPerBrowser: parseInt(process.env.MAX_JOBS_PER_BROWSER || '2', 10), // Reduced for stability
  browserIdleTimeout: parseInt(process.env.BROWSER_IDLE_TIMEOUT || '30000', 10), // 30 seconds
  maxRequestsPerInstance: parseInt(process.env.MAX_REQUESTS_PER_INSTANCE || '10', 10),
  
  // Enhanced browser arguments for Railway environment (conservative approach)
  browserArgs: process.env.BROWSER_ARGS?.split(',') || [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--disable-web-security',
    '--disable-extensions',
    '--disable-plugins',
    '--disable-sync',
    '--disable-translate',
    '--disable-default-apps',
    '--disable-background-networking',
    '--disable-component-update',
    '--disable-domain-reliability',
    '--disable-hang-monitor',
    '--disable-prompt-on-repost',
    '--disable-client-side-phishing-detection',
    '--no-default-browser-check',
    '--no-first-run',
    '--no-pings',
    '--no-zygote',
    '--memory-pressure-off',
    '--max-old-space-size=256',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    '--disable-features=TranslateUI',
    '--disable-features=VizDisplayCompositor',
    // Railway-specific fixes for file system access
    '--disable-crash-reporter',
    '--disable-crash-reporter-for-testing',
    '--user-data-dir=/tmp/chrome-user-data',
    '--data-path=/tmp/chrome-data',
    '--disk-cache-dir=/tmp/chrome-cache',
    '--crash-dumps-dir=/tmp/chrome-crashes',
    '--disable-crashpad',
    '--disable-breakpad',
    '--disable-features=Crashpad',
    '--disable-logging',
    '--disable-logging-redirect',
    '--disable-audio-input',
    '--disable-audio-output',
    '--disable-notifications',
    '--disable-geolocation',
    '--disable-microphone',
    '--disable-camera',
    '--disable-desktop-notifications',
    '--disable-permissions-api',
    '--disable-device-discovery-notifications',
    '--disable-default-apps',
    '--disable-speech-api',
    '--disable-file-system',
    '--disable-web-bluetooth',
    '--disable-usb-keyboard-detect',
    '--disable-local-storage',
    '--disable-session-storage',
    '--disable-databases',
    '--disable-application-cache',
    '--single-process'
  ],

  // Memory Management (optimized for Railway's 1GB limit)
  maxMemoryPerBrowser: parseInt(process.env.MAX_MEMORY_PER_BROWSER || '134217728', 10), // 128MB
  memoryWarningThreshold: parseFloat(process.env.MEMORY_WARNING_THRESHOLD || '0.6'), // 60%
  memoryCriticalThreshold: parseFloat(process.env.MEMORY_CRITICAL_THRESHOLD || '0.75'), // 75%
  garbageCollectionInterval: parseInt(process.env.GARBAGE_COLLECTION_INTERVAL || '10000', 10), // 10 seconds

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
