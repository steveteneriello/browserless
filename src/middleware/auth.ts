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

  // Support multiple valid tokens
  const validTokens = [
    config.apiKey,
    config.token,
    'bananalemon', // Legacy token
    'XBQWSqW34JDCj1NYMmhyZF1fEgPYbgFsybj9jq46sJok2Ork', // Screenshot engine token
    'default-api-key' // Development token
  ].filter(Boolean); // Remove any undefined values

  if (!validTokens.includes(providedAuth)) {
    throw createError('Invalid API key or token', 401);
  }

  next();
};
