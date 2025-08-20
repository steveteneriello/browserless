import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { validateApiKey } from './middleware/auth';
import { browserRoutes } from './routes/browser';
import { healthRoutes } from './routes/health';
import { metricsRoutes } from './routes/metrics';
import { BrowserPool } from './services/BrowserPool';
import { QueueService } from './services/QueueService';
import { MetricsService } from './services/MetricsService';

export class App {
  public app: express.Application;
  private browserPool: BrowserPool;
  private queueService: QueueService;
  private metricsService: MetricsService;

  constructor() {
    this.app = express();
    this.browserPool = new BrowserPool();
    this.queueService = new QueueService();
    this.metricsService = new MetricsService();
    
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"]
        }
      }
    }));

    this.app.use(cors({
      origin: process.env.NODE_ENV === 'production' ? false : true,
      credentials: true
    }));

    this.app.use(compression());

    // Rate limiting
    const limiter = rateLimit({
      windowMs: config.rateLimitWindowMs,
      max: config.rateLimitMaxRequests,
      message: 'Too many requests from this IP, please try again later.',
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use('/api/', limiter);

    // Logging
    this.app.use(morgan('combined', {
      stream: { write: message => logger.info(message.trim()) }
    }));

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // API key validation for protected routes
    this.app.use('/api/browser', validateApiKey);
  }

  private initializeRoutes(): void {
    // Health check (no auth required)
    this.app.use('/health', healthRoutes);
    
    // Metrics (no auth required for monitoring)
    if (config.enableMetrics) {
      this.app.use('/metrics', metricsRoutes);
    }

    // Browser automation routes
    this.app.use('/api/browser', browserRoutes(this.browserPool, this.queueService));

    // Root route
    this.app.get('/', (req, res) => {
      res.json({
        service: 'Browserless API',
        version: '1.0.0',
        status: 'running',
        endpoints: [
          'GET /health - Health check',
          'GET /metrics - Prometheus metrics',
          'POST /api/browser/screenshot - Take screenshot',
          'POST /api/browser/pdf - Generate PDF',
          'POST /api/browser/scrape - Scrape page content',
          'POST /api/browser/evaluate - Execute JavaScript'
        ]
      });
    });
  }

  private initializeErrorHandling(): void {
    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({ error: 'Route not found' });
    });

    // Global error handler
    this.app.use(errorHandler);
  }

  public async start(): Promise<void> {
    try {
      // Initialize services
      await this.browserPool.initialize();
      await this.queueService.initialize();
      
      // Start server
      const server = this.app.listen(config.port, () => {
        logger.info(`Server running on port ${config.port}`);
        logger.info(`Environment: ${config.nodeEnv}`);
      });

      // Graceful shutdown
      process.on('SIGTERM', () => this.gracefulShutdown(server));
      process.on('SIGINT', () => this.gracefulShutdown(server));

    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  private async gracefulShutdown(server: any): Promise<void> {
    logger.info('Starting graceful shutdown...');

    server.close(async () => {
      try {
        await this.browserPool.cleanup();
        await this.queueService.cleanup();
        logger.info('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
      }
    });
  }
}
