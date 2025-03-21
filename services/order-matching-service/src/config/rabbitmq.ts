// order-matching-service/src/config/rabbitmq.ts

import amqp from 'amqplib';
import { logger } from '../utils/logger';

let channel: amqp.Channel;

export const connectRabbitMQ = async (): Promise<void> => {
  try {
    const rabbitUrl = process.env.RABBIT_MQ_URL || 'amqp://localhost:5672';
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
    
    logger.info('Connected to RabbitMQ');
  } catch (error) {
    logger.error('RabbitMQ connection error:', error);
    throw error;
  }
};

const setupQueues = async (): Promise<void> => {
  // Define queues specific to order-matching service
  const queues = [
    'order-events',          // เหตุการณ์เกี่ยวกับออเดอร์
    'driver-events',         // เหตุการณ์เกี่ยวกับคนขับ
    'driver-location-events', // เหตุการณ์อัพเดทตำแหน่งคนขับ
    'payment-events'         // เหตุการณ์เกี่ยวกับการชำระเงิน
  ];
  
  // Create queues if they don't exist
  for (const queue of queues) {
    await channel.assertQueue(queue, { durable: true });
    logger.info(`Queue ${queue} is ready`);
  }
};

export const publishMessage = async (queue: string, message: object): Promise<boolean> => {
  try {
    if (!channel) {
      await connectRabbitMQ();
    }
    
    const result = channel.sendToQueue(
      queue,
      Buffer.from(JSON.stringify(message)),
      { persistent: true }
    );

    logger.debug(`Published message to ${queue}`, { messageType: (message as any).event });
    
    return result;
  } catch (error) {
    logger.error('Failed to publish message:', error);
    return false;
  }
};

export const consumeMessages = async (queue: string, callback: (message: any) => Promise<void>): Promise<void> => {
  try {
    if (!channel) {
      await connectRabbitMQ();
    }
    
    await channel.consume(
      queue,
      async (message) => {
        if (message) {
          try {
            const content = JSON.parse(message.content.toString());
            await callback(content);
            channel.ack(message);
          } catch (error) {
            logger.error('Error processing message:', error);
            channel.nack(message);
          }
        }
      },
      { noAck: false }
    );

    logger.info(`Consumer for queue ${queue} is ready`);
  } catch (error) {
    logger.error('Failed to consume messages:', error);
    throw error;
  }
};

// ฟังก์ชันนี้ถูกเรียกเมื่อแอปพลิเคชันปิด เพื่อปิดการเชื่อมต่อ RabbitMQ อย่างเรียบร้อย
export const closeRabbitMQConnection = async (): Promise<void> => {
  try {
    if (channel) {
      await channel.close();
      logger.info('RabbitMQ channel closed');
    }
  } catch (error) {
    logger.error('Error closing RabbitMQ connection:', error);
  }
};