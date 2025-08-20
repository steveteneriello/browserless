import Bull from 'bull';
import Redis from 'redis';
import { config } from '../config';
import { logger } from '../utils/logger';

export interface JobData {
  type: 'screenshot' | 'pdf' | 'scrape' | 'evaluate';
  url?: string;
  options?: any;
  code?: string;
  sessionId?: string;
}

export interface JobResult {
  success: boolean;
  data?: any;
  error?: string;
  executionTime: number;
}

export class QueueService {
  private queue: Bull.Queue<JobData> | null = null;
  private redisClient: Redis.RedisClientType | null = null;

  async initialize(): Promise<void> {
    try {
      logger.info('Initializing queue service...');

      // Initialize Redis client
      this.redisClient = Redis.createClient({
        url: config.redisUrl,
        socket: {
          reconnectStrategy: (retries) => Math.min(retries * 50, 500)
        }
      });

      this.redisClient.on('error', (err) => {
        logger.error('Redis client error:', err);
      });

      this.redisClient.on('connect', () => {
        logger.info('Connected to Redis');
      });

      await this.redisClient.connect();

      // Initialize Bull queue
      this.queue = new Bull('browserless-queue', {
        redis: {
          port: 6379,
          host: new URL(config.redisUrl).hostname,
          password: new URL(config.redisUrl).password || undefined,
        },
        defaultJobOptions: {
          removeOnComplete: 10,
          removeOnFail: 25,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      });

      // Set up queue event handlers
      this.queue.on('completed', (job, result) => {
        logger.info(`Job ${job.id} completed successfully`);
      });

      this.queue.on('failed', (job, err) => {
        logger.error(`Job ${job.id} failed:`, err);
      });

      this.queue.on('stalled', (job) => {
        logger.warn(`Job ${job.id} stalled`);
      });

      logger.info('Queue service initialized successfully');

    } catch (error) {
      logger.error('Failed to initialize queue service:', error);
      throw error;
    }
  }

  async addJob(jobData: JobData, priority: number = 0): Promise<Bull.Job<JobData>> {
    if (!this.queue) {
      throw new Error('Queue not initialized');
    }

    const job = await this.queue.add(jobData, {
      priority,
      delay: 0,
    });

    logger.info(`Added job ${job.id} to queue`);
    return job;
  }

  async getJobStatus(jobId: string): Promise<any> {
    if (!this.queue) {
      throw new Error('Queue not initialized');
    }

    const job = await this.queue.getJob(jobId);
    if (!job) {
      return null;
    }

    return {
      id: job.id,
      data: job.data,
      progress: job.progress(),
      state: await job.getState(),
      createdAt: new Date(job.timestamp),
      processedAt: job.processedOn ? new Date(job.processedOn) : null,
      finishedAt: job.finishedOn ? new Date(job.finishedOn) : null,
      failedReason: job.failedReason,
      returnValue: job.returnvalue,
    };
  }

  async getQueueStats(): Promise<any> {
    if (!this.queue) {
      throw new Error('Queue not initialized');
    }

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.queue.getWaiting(),
      this.queue.getActive(),
      this.queue.getCompleted(),
      this.queue.getFailed(),
      this.queue.getDelayed(),
    ]);

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length,
      total: waiting.length + active.length + completed.length + failed.length + delayed.length,
    };
  }

  async pauseQueue(): Promise<void> {
    if (!this.queue) {
      throw new Error('Queue not initialized');
    }

    await this.queue.pause();
    logger.info('Queue paused');
  }

  async resumeQueue(): Promise<void> {
    if (!this.queue) {
      throw new Error('Queue not initialized');
    }

    await this.queue.resume();
    logger.info('Queue resumed');
  }

  async cleanup(): Promise<void> {
    logger.info('Cleaning up queue service...');

    if (this.queue) {
      await this.queue.close();
    }

    if (this.redisClient) {
      await this.redisClient.quit();
    }

    logger.info('Queue service cleanup completed');
  }
}
