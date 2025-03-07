import express, { Application } from 'express';
import morgan from 'morgan';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import routes from './routes';
import errorHandler from './middlewares/errorHandler';
import logger from './utils/logger';

// Create Express application
const app: Application = express();

// Middleware setup
app.use(helmet()); // Security headers
app.use(compression()); // Compress responses
app.use(cors()); // Enable CORS
app.use(express.json()); // Parse JSON request body
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded request body
app.use(morgan('combined', { stream: logger.stream })); // HTTP request logging

// API Routes
app.use('/api/v1/drivers', routes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'driver-api'
  });
});

// Error handling middleware
app.use(errorHandler);

export default app;