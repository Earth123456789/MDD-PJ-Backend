import amqp from 'amqplib'; 
import { logger } from '../utils/logger'; 
 
let channel: amqp.Channel; 
 
export const connectRabbitMQ = async (): Promise<void> => { 
  try { 
    const connection = await amqp.connect(rabbitUrl); 
 
    // Create a channel 
    channel = await connection.createChannel(); 
 
    // Ensure queues exist 
    await setupQueues(); 
 
    // Handle connection close 
    connection.on('close', () => { 
      logger.warn('RabbitMQ connection closed'); 
      setTimeout(connectRabbitMQ, 5000); 
    }); 
 
  } catch (error) { 
    logger.error('RabbitMQ connection error:', error); 
    throw error; 
  } 
}; 
