import { Router, Request, Response } from 'express';
import { config } from '../config';
import { asyncHandler } from '../middleware/errorHandler';

export const statusRoutes = Router();

statusRoutes.get('/', asyncHandler(async (req: Request, res: Response) => {
  res.json({
    service: 'Browserless API',
    status: 'running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    
    // Critical configuration for parent app integration
    integration: {
      websocketEndpoint: `wss://${req.get('host')}?token=${config.token}`,
      httpEndpoint: `https://${req.get('host')}/api/browser`,
      token: config.token,
      authMethods: [
        'Query parameter: ?token=' + config.token,
        'Header: X-API-Key: ' + config.token,
        'Authorization: Bearer ' + config.token
      ]
    },

    // Current service status
    runtime: {
      environment: config.nodeEnv,
      maxConcurrentSessions: config.maxConcurrentSessions,
      browserTimeout: config.browserTimeout,
      memoryLimits: {
        maxMemoryPerBrowser: config.maxMemoryPerBrowser,
        warningThreshold: config.memoryWarningThreshold,
        criticalThreshold: config.memoryCriticalThreshold
      }
    },

    // Troubleshooting tips
    troubleshooting: {
      commonIssues: [
        'Ensure token authentication is properly configured',
        'Check network connectivity to this endpoint',
        'Verify browser timeout settings are sufficient',
        'Monitor memory usage and concurrent session limits',
        'Check logs for browser launch failures'
      ],
      testEndpoints: [
        `GET ${req.protocol}://${req.get('host')}/health - Health check`,
        `GET ${req.protocol}://${req.get('host')}/debug/config - Debug configuration`,
        `GET ${req.protocol}://${req.get('host')}/debug/test - Browser test`,
        `POST ${req.protocol}://${req.get('host')}/api/browser/screenshot?token=${config.token} - Screenshot test`
      ]
    }
  });
}));
