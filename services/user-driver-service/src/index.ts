// user-driver-service/src/index.ts

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { setupSwagger } from './config/swagger';
import { connectRabbitMQ, closeRabbitMQConnection } from './config/rabbitmq';
import routes from './routes';
import { logger } from './utils/logger';
import { setupEventConsumers } from './consumers';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Setup Swagger
setupSwagger(app);

// API Routes
app.use('/api', routes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'user-driver-service' });
});

// Start server
const server = app.listen(port, async () => {
  logger.info(`User & Driver Service running on port ${port}`);
  
  // Connect to RabbitMQ if enabled
  if (process.env.ENABLE_RABBITMQ === 'true') {
    try {
      await connectRabbitMQ();
      // Setup event consumers
      await setupEventConsumers();
    } catch (error) {
      logger.error('Failed to connect to RabbitMQ:', error);
      logger.warn('Continuing without RabbitMQ support');
    }
  } else {
    logger.info('RabbitMQ support is disabled');
  }
});

// Graceful shutdown
const shutdown = async () => {
  logger.info('Shutting down server...');
  
  // Close RabbitMQ connection
  await closeRabbitMQConnection();
  
  // Close server
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// Handle shutdown signals
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);