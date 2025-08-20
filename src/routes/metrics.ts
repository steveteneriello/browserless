import { Router, Request, Response } from 'express';
import { MetricsService } from '../services/MetricsService';
import { asyncHandler } from '../middleware/errorHandler';

const metricsService = new MetricsService();

export const metricsRoutes = Router();

metricsRoutes.get('/', asyncHandler(async (req: Request, res: Response) => {
  const metrics = await metricsService.getMetrics();
  
  res.set('Content-Type', metricsService.getContentType());
  res.send(metrics);
}));
