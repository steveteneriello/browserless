import { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { createError } from './errorHandler';

export const validateApiKey = (req: Request, res: Response, next: NextFunction): void => {
  // Support multiple authentication methods
  const apiKey = req.headers['x-api-key'] as string;
  const token = req.query.token as string || req.headers['authorization']?.replace('Bearer ', '');
  
  const providedAuth = apiKey || token;

  if (!providedAuth) {
    throw createError('API key or token is required. Provide via X-API-Key header or ?token= query parameter', 401);
  }

  if (providedAuth !== config.apiKey && providedAuth !== config.token) {
    throw createError('Invalid API key or token', 401);
  }

  next();
};
