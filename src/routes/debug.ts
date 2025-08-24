import { Router, Request, Response } from 'express';
import { config } from '../config';
import { asyncHandler } from '../middleware/errorHandler';
import { BrowserPool } from '../services/BrowserPool';

export const debugRoutes = (browserPool: BrowserPool) => {
  const router = Router();

  // Debug endpoint to test browser functionality
  router.get('/test', asyncHandler(async (req: Request, res: Response) => {
    try {
      const session = await browserPool.createSession();
      const page = await browserPool.createPage(session.id);
      
      await page.goto('data:text/html,<h1>Test Page</h1><p>Browser is working!</p>');
      
      const screenshot = await page.screenshot({ 
        type: 'png',
        fullPage: true 
      });
      
      await page.close();
      await browserPool.closeSession(session.id);
      
      res.set('Content-Type', 'image/png');
      res.send(screenshot);
    } catch (error) {
      res.status(500).json({
        error: 'Browser test failed',
        message: error instanceof Error ? error.message : String(error),
        config: {
          browserArgs: config.browserArgs,
          maxConcurrentSessions: config.maxConcurrentSessions,
          browserTimeout: config.browserTimeout
        }
      });
    }
  }));

  // Configuration endpoint
  router.get('/config', asyncHandler(async (req: Request, res: Response) => {
    res.json({
      service: 'Browserless Debug',
      environment: config.nodeEnv,
      token: config.token ? 'SET' : 'NOT SET',
      tokenValue: config.token, // Only for debugging
      configuration: {
        port: config.port,
        browserTimeout: config.browserTimeout,
        maxConcurrentSessions: config.maxConcurrentSessions,
        browserArgs: config.browserArgs,
        memoryLimits: {
          maxMemoryPerBrowser: config.maxMemoryPerBrowser,
          memoryWarningThreshold: config.memoryWarningThreshold,
          memoryCriticalThreshold: config.memoryCriticalThreshold
        }
      },
      endpoints: {
        websocket: `wss://${req.get('host')}?token=${config.token}`,
        httpScreenshot: `https://${req.get('host')}/api/browser/screenshot?token=${config.token}`,
        health: `https://${req.get('host')}/health`
      }
    });
  }));

  return router;
};
