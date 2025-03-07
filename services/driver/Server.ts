import app from './app';
import { PrismaClient } from '@prisma/client';
import logger from './utils/logger';

const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

// Database connection and server startup
async function startServer() {
  try {
    // Test database connection
    await prisma.$connect();
    logger.info('Database connection established with Neon PostgreSQL');

    // Start server
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Failed to start server:');
    logger.error(error);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise);
  logger.error('Reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:');
  logger.error(error);
  process.exit(1);
});

// Handle termination signals
process.on('SIGINT', async () => {
  await gracefulShutdown('SIGINT');
});

process.on('SIGTERM', async () => {
  await gracefulShutdown('SIGTERM');
});

// Graceful shutdown function
async function gracefulShutdown(signal: string) {
  logger.info(`${signal} received. Shutting down gracefully...`);
  
  try {
    // Disconnect from database
    await prisma.$disconnect();
    logger.info('Database connection closed');
    
    // Exit process
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:');
    logger.error(error);
    process.exit(1);
  }
}

// Start the server
startServer();