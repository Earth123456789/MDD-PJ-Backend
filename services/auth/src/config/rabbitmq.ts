import amqp, { Channel, Connection } from "amqplib";
import { logger } from "../utils/logger";

let channel: Channel | null = null;
let connection: Connection | null = null;

export const connectRabbitMQ = async () => {
  try {
    if (!process.env.RABBITMQ_URL) {
      throw new Error("RABBITMQ_URL is not defined in .env");
    }

    connection = await amqp.connect(process.env.RABBITMQ_URL);
    
    if (!connection) {
      throw new Error("Failed to establish connection to RabbitMQ");
    }

    channel = await connection.createChannel();
    
    if (!channel) {
      throw new Error("Failed to create RabbitMQ channel");
    }

    // ตรวจสอบว่า Channel ถูกสร้างแล้วก่อนทำงานต่อ
    await channel.assertExchange("auth_exchange", "direct", { durable: true });
    await channel.assertQueue("auth_service_events", { durable: true });

    logger.info("Connected to RabbitMQ");
  } catch (error) {
    logger.error("RabbitMQ Connection Error:", error);
    throw error;
  }
};

export const publishMessage = async (queue: string, message: any) => {
  if (!channel) {
    throw new Error("RabbitMQ channel is not initialized");
  }

  try {
    const msgBuffer = Buffer.from(JSON.stringify(message));
    channel.sendToQueue(queue, msgBuffer);
    logger.info(`Published message to queue: ${queue}`);
  } catch (error) {
    logger.error(`Error publishing message to queue ${queue}:`, error);
    throw error;
  }
};

export const closeRabbitMQConnection = async () => {
  try {
    if (channel) {
      await channel.close();
      channel = null; // รีเซ็ตค่า channel เป็น null
    }

    if (connection) {
      await connection.close();
      connection = null; // รีเซ็ตค่า connection เป็น null
    }

    logger.info("RabbitMQ connection closed");
  } catch (error) {
    logger.error("Error closing RabbitMQ connection:", error);
  }
};
