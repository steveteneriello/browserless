import puppeteer, { Browser, Page } from 'puppeteer';
import { config } from '../config';
import { logger } from '../utils/logger';
import { createError } from '../middleware/errorHandler';

export interface BrowserSession {
  id: string;
  browser: Browser;
  createdAt: Date;
  lastUsed: Date;
  isActive: boolean;
}

export class BrowserPool {
  private sessions: Map<string, BrowserSession> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  async initialize(): Promise<void> {
    logger.info('Initializing browser pool...');
    
    // Skip browser pool initialization in build environment
    if (process.env.NODE_ENV === 'build' || 
        process.env.RAILWAY_ENVIRONMENT === 'build' ||
        process.env.NIXPACKS_BUILD_PHASE) {
      logger.info('Skipping browser pool initialization in build environment');
      return;
    }
    
    // Start cleanup interval
    this.cleanupInterval = setInterval(
      () => this.cleanupSessions(),
      30000 // Check every 30 seconds
    );

    logger.info('Browser pool initialized successfully');
  }

  async createSession(retryCount = 0): Promise<BrowserSession> {
    if (this.sessions.size >= config.maxConcurrentSessions) {
      throw createError(`Maximum concurrent sessions reached (${config.maxConcurrentSessions})`, 429);
    }

    const maxRetries = 3;
    
    try {
      logger.info('Launching new browser session...', {
        args: config.browserArgs.slice(0, 5), // Log only first 5 args to avoid clutter
        timeout: config.browserTimeout,
        currentSessions: this.sessions.size,
        attempt: retryCount + 1
      });

      const browser = await puppeteer.launch({
        headless: true,
        args: config.browserArgs,
        timeout: config.browserTimeout,
        protocolTimeout: config.browserTimeout * 2,
        ignoreDefaultArgs: false,
        dumpio: process.env.NODE_ENV === 'development', // Only dump output in dev
        pipe: false, // Use websocket instead of pipe for better compatibility
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH, // Allow custom Chrome path
      });

      const sessionId = this.generateSessionId();
      const session: BrowserSession = {
        id: sessionId,
        browser,
        createdAt: new Date(),
        lastUsed: new Date(),
        isActive: true
      };

      this.sessions.set(sessionId, session);
      
      // Set up browser disconnect handler
      browser.on('disconnected', () => {
        logger.warn(`Browser session ${sessionId} disconnected`);
        this.sessions.delete(sessionId);
      });

      logger.info(`Created browser session ${sessionId}`, {
        totalSessions: this.sessions.size,
        sessionId
      });
      return session;

    } catch (error) {
      logger.error('Failed to create browser session:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        attempt: retryCount + 1,
        maxRetries
      });

      // Retry logic for browser launch failures
      if (retryCount < maxRetries) {
        logger.info(`Retrying browser launch (attempt ${retryCount + 2}/${maxRetries + 1})...`);
        await new Promise(resolve => setTimeout(resolve, 2000 * (retryCount + 1))); // Exponential backoff
        return this.createSession(retryCount + 1);
      }

      throw createError(
        `Failed to launch browser after ${maxRetries + 1} attempts: ${error instanceof Error ? error.message : String(error)}`, 
        500
      );
    }
  }

  async getSession(sessionId: string): Promise<BrowserSession> {
    const session = this.sessions.get(sessionId);
    
    if (!session || !session.isActive) {
      throw createError('Session not found or inactive', 404);
    }

    session.lastUsed = new Date();
    return session;
  }

  async createPage(sessionId: string): Promise<Page> {
    const session = await this.getSession(sessionId);
    
    try {
      const page = await session.browser.newPage();
      
      // Set default timeout
      page.setDefaultTimeout(config.browserTimeout);
      page.setDefaultNavigationTimeout(config.browserTimeout);

      // Set viewport
      await page.setViewport({ width: 1920, height: 1080 });

      // Block unnecessary resources to improve performance
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        const resourceType = req.resourceType();
        if (['font', 'image', 'media'].includes(resourceType)) {
          req.abort();
        } else {
          req.continue();
        }
      });

      return page;

    } catch (error) {
      logger.error(`Failed to create page for session ${sessionId}:`, error);
      throw createError('Failed to create page', 500);
    }
  }

  async closeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    
    if (session) {
      try {
        await session.browser.close();
        this.sessions.delete(sessionId);
        logger.info(`Closed browser session ${sessionId}`);
      } catch (error) {
        logger.error(`Error closing session ${sessionId}:`, error);
      }
    }
  }

  private cleanupSessions(): void {
    const now = new Date();
    const maxAge = 10 * 60 * 1000; // 10 minutes

    for (const [sessionId, session] of this.sessions.entries()) {
      const age = now.getTime() - session.lastUsed.getTime();
      
      if (age > maxAge) {
        logger.info(`Cleaning up stale session ${sessionId}`);
        this.closeSession(sessionId);
      }
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async cleanup(): Promise<void> {
    logger.info('Cleaning up browser pool...');
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    const promises = Array.from(this.sessions.keys()).map(sessionId => 
      this.closeSession(sessionId)
    );

    await Promise.allSettled(promises);
    this.sessions.clear();
    
    logger.info('Browser pool cleanup completed');
  }

  getStats() {
    return {
      totalSessions: this.sessions.size,
      maxSessions: config.maxConcurrentSessions,
      activeSessions: Array.from(this.sessions.values()).filter(s => s.isActive).length
    };
  }
}
