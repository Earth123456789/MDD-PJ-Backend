import express from 'express'; 
import cors from 'cors'; 
import dotenv from 'dotenv'; 
import { setupSwagger } from './config/swagger'; 
import { connectRabbitMQ } from './config/rabbitmq'; 
import routes from './routes'; 
import { logger } from './utils/logger'; 
 
// Load environment variables 
dotenv.config(); 
 
const app = express(); 
 
// Middleware 
app.use(cors()); 
app.use(express.json()); 
 
// Setup Swagger 
setupSwagger(app); 
 
// API Routes 
app.use('/api', routes); 
 
// Health check endpoint 
app.get('/health', (req, res) => { 
  res.status(200).json({ status: 'ok' }); 
}); 
 
// Start server 
app.listen(port, async () => { 
  logger.info(`admin-dashboard-service running on port ${port}`); 
 
  // Connect to RabbitMQ 
  try { 
    await connectRabbitMQ(); 
    logger.info('Connected to RabbitMQ'); 
  } catch (error) { 
    logger.error('Failed to connect to RabbitMQ:', error); 
  } 
}); 
