import { App } from './app';
import { logger } from './utils/logger';

async function main(): Promise<void> {
  try {
    logger.info('Starting application initialization...');
    logger.info(`Node environment: ${process.env.NODE_ENV}`);
    logger.info(`Railway environment: ${process.env.RAILWAY_ENVIRONMENT}`);
    logger.info(`Nixpacks build phase: ${process.env.NIXPACKS_BUILD_PHASE}`);
    
    const app = new App();
    await app.start();
  } catch (error) {
    logger.error('Failed to start application:', error);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

main();
