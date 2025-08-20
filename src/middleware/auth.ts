import { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { createError } from './errorHandler';

export const validateApiKey = (req: Request, res: Response, next: NextFunction): void => {
  const apiKey = req.headers['x-api-key'] as string;

  if (!apiKey) {
    throw createError('API key is required', 401);
  }

  if (apiKey !== config.apiKey) {
    throw createError('Invalid API key', 401);
  }

  next();
};
