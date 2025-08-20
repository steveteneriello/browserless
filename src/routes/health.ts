import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';

export const healthRoutes = Router();

let startTime = Date.now();

healthRoutes.get('/', asyncHandler(async (req: Request, res: Response) => {
  const uptime = Date.now() - startTime;
  
  const healthCheck = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(uptime / 1000)}s`,
    service: 'browserless-api',
    version: '1.0.0',
    checks: {
      server: 'healthy',
      memory: {
        used: process.memoryUsage().heapUsed,
        total: process.memoryUsage().heapTotal,
        external: process.memoryUsage().external,
        rss: process.memoryUsage().rss
      }
    }
  };

  res.status(200).json(healthCheck);
}));

healthRoutes.get('/ready', asyncHandler(async (req: Request, res: Response) => {
  // Add more sophisticated readiness checks here
  // For example, check database connections, external services, etc.
  
  const ready = {
    status: 'ready',
    timestamp: new Date().toISOString(),
    checks: {
      server: 'ready',
      // Add more checks as needed
    }
  };

  res.status(200).json(ready);
}));

healthRoutes.get('/live', asyncHandler(async (req: Request, res: Response) => {
  // Simple liveness probe
  res.status(200).json({ 
    status: 'alive',
    timestamp: new Date().toISOString()
  });
}));
