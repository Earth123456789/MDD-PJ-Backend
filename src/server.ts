import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { PrismaClient } from '@prisma/client';
import config from './config/app.config';
import { specs } from './config/swagger.config';
import driverRoutes from './routes/driver.routes';
import vehicleRoutes from './routes/vehicle.routes';
import assignmentRoutes from './routes/assignment.routes';
import logger from './utils/logger.util';

// Initialize Prisma client
const prisma = new PrismaClient();

// Create Express app
const app: Express = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, { explorer: true }));

// Routes - ลบ prefix '/api'
app.use('/drivers', driverRoutes);
app.use('/vehicles', vehicleRoutes);
app.use('/assignments', assignmentRoutes);

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error(err.stack);
  res.status(500).json({
    message: 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { error: err.message }),
  });
});

// Start server
const PORT = config.port || 3002;
app.listen(PORT, () => {
  logger.info(`Driver service running on port ${PORT}`);
  logger.info(`Swagger documentation available at http://localhost:${PORT}/api-docs`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  logger.info('Disconnected from database');
  process.exit(0);
});

export default app;