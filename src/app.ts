import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
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
  public server: any;
  public wss: WebSocketServer | undefined;
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
      stream: { write: (message: string) => logger.info(message.trim()) }
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
    this.app.get('/', (req: express.Request, res: express.Response) => {
      res.json({
        service: 'Browserless API',
        version: '1.0.0',
        status: 'running',
        websocket: {
          endpoint: `wss://${req.get('host')}?token=${config.token}`,
          note: 'Use this WebSocket endpoint for browserless.io compatible connections'
        },
        endpoints: [
          'GET /health - Health check',
          'GET /metrics - Prometheus metrics',
          'POST /api/browser/screenshot - Take screenshot',
          'POST /api/browser/pdf - Generate PDF',
          'POST /api/browser/scrape - Scrape page content',
          'POST /api/browser/evaluate - Execute JavaScript'
        ],
        authentication: {
          methods: ['X-API-Key header', 'token query parameter', 'Bearer token'],
          example: `curl -H "X-API-Key: ${config.token}" https://${req.get('host')}/api/browser/screenshot`
        }
      });
    });
  }

  private initializeErrorHandling(): void {
    // 404 handler
    this.app.use('*', (req: express.Request, res: express.Response) => {
      res.status(404).json({ error: 'Route not found' });
    });

    // Global error handler
    this.app.use(errorHandler);
  }

  public async start(): Promise<void> {
    try {
      // Check if we're in a build environment
      const isBuildEnv = process.env.NODE_ENV === 'build' || 
                        process.env.RAILWAY_ENVIRONMENT === 'build' ||
                        process.env.NIXPACKS_BUILD_PHASE;

      if (isBuildEnv) {
        logger.info('Running in build environment, skipping service initialization');
        // Still start the server for health checks during build
        const server = this.app.listen(config.port, () => {
          logger.info(`Server running on port ${config.port} (build mode)`);
        });
        return;
      }

      // Initialize services with error handling
      try {
        await this.browserPool.initialize();
        logger.info('Browser pool initialized successfully');
      } catch (error) {
        logger.error('Failed to initialize browser pool:', error);
        if (process.env.NODE_ENV === 'production') {
          throw error;
        }
      }

      try {
        await this.queueService.initialize();
        logger.info('Queue service initialized successfully');
      } catch (error) {
        logger.error('Failed to initialize queue service:', error);
        if (process.env.NODE_ENV === 'production') {
          logger.warn('Continuing without queue service');
        }
      }
      
      // Start server with WebSocket support
      this.server = createServer(this.app);
      
      // Initialize WebSocket server
      this.wss = new WebSocketServer({ 
        server: this.server,
        path: '/',
        verifyClient: (info) => {
          // Check for token in query string
          const url = new URL(info.req.url!, `http://${info.req.headers.host}`);
          const token = url.searchParams.get('token');
          return token === config.token;
        }
      });

      // Handle WebSocket connections
      this.wss.on('connection', (ws, req) => {
        logger.info('WebSocket connection established');
        
        ws.on('message', async (message) => {
          try {
            const data = JSON.parse(message.toString());
            // Handle browserless.io-style WebSocket messages
            logger.info('WebSocket message received:', data);
          } catch (error) {
            logger.error('WebSocket message error:', error);
            ws.send(JSON.stringify({ error: 'Invalid message format' }));
          }
        });

        ws.on('close', () => {
          logger.info('WebSocket connection closed');
        });
      });

      this.server.listen(config.port, () => {
        logger.info(`Server running on port ${config.port}`);
        logger.info(`WebSocket endpoint: wss://your-domain.railway.app?token=${config.token}`);
        logger.info(`Environment: ${config.nodeEnv}`);
      });

      // Graceful shutdown
      process.on('SIGTERM', () => this.gracefulShutdown(this.server));
      process.on('SIGINT', () => this.gracefulShutdown(this.server));

    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  private async gracefulShutdown(server: any): Promise<void> {
    logger.info('Starting graceful shutdown...');

    // Close WebSocket server first
    if (this.wss) {
      this.wss.close();
      logger.info('WebSocket server closed');
    }

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
