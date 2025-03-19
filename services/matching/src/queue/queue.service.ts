import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as amqp from 'amqplib';
import { Connection, Channel } from 'amqplib';

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private connection: Connection;
  private channel: Channel;
  private readonly logger = new Logger(QueueService.name);
  private readonly queues = [
    'order-created',
    'order-matched',
    'order-status-changed',
    'vehicle-status-changed',
    'vehicle-location-updated',
  ];

  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  private async connect() {
    try {
      const rabbitmqUrl = this.configService.get<string>('RABBITMQ_URL');

      if (!rabbitmqUrl) {
        throw new Error('RABBITMQ_URL is not defined in the config');
      }

      this.logger.log(`Connecting to RabbitMQ: ${rabbitmqUrl}`);

      // Double-cast to satisfy TypeScript, then use "as any" to access runtime methods.
      this.connection = (await amqp.connect(
        rabbitmqUrl,
      )) as unknown as Connection;
      this.channel = (await (
        this.connection as any
      ).createChannel()) as unknown as Channel;

      // Initialize all queues
      for (const queue of this.queues) {
        await this.channel.assertQueue(queue, { durable: true });
        this.logger.log(`Queue declared: ${queue}`);
      }

      this.logger.log('Connected to RabbitMQ successfully');

      // Set up consumers
      await this.setupConsumers();
    } catch (error) {
      this.logger.error(`Failed to connect to RabbitMQ: ${error.message}`);
      // Attempt to reconnect after a delay
      setTimeout(() => this.connect(), 5000);
    }
  }

  private async disconnect() {
    try {
      if (this.channel) {
        await this.channel.close(); // Close the channel first
      }
      if (this.connection) {
        // Cast to "any" so that TypeScript allows using the close method.
        await (this.connection as any).close();
      }
      this.logger.log('Disconnected from RabbitMQ');
    } catch (error) {
      this.logger.error(`Error disconnecting from RabbitMQ: ${error.message}`);
    }
  }

  private async setupConsumers() {
    // Consumer for "order-created" queue
    await this.channel.consume('order-created', async (msg) => {
      if (msg) {
        try {
          const content = JSON.parse(msg.content.toString());
          this.logger.log(
            `Received order-created message: ${JSON.stringify(content)}`,
          );
          // Emit event for the application to handle
          this.eventEmitter.emit('order.created', content);
          // Acknowledge the message
          this.channel.ack(msg);
        } catch (error) {
          this.logger.error(
            `Error processing order-created message: ${error.message}`,
          );
          // Reject the message and requeue it
          this.channel.nack(msg, false, true);
        }
      }
    });

    // Consumer for "vehicle-location-updated" queue
    await this.channel.consume('vehicle-location-updated', async (msg) => {
      if (msg) {
        try {
          const content = JSON.parse(msg.content.toString());
          this.logger.log(
            `Received vehicle-location-updated message: ${JSON.stringify(content)}`,
          );
          // Emit event for the application to handle
          this.eventEmitter.emit('vehicle.location.updated', content);
          // Acknowledge the message
          this.channel.ack(msg);
        } catch (error) {
          this.logger.error(
            `Error processing vehicle-location-updated message: ${error.message}`,
          );
          // Reject the message and requeue it
          this.channel.nack(msg, false, true);
        }
      }
    });

    // Additional consumers for other queues can be set up similarly
  }

  /**
   * Send a message to a specific queue.
   * @param queue - Name of the queue.
   * @param message - Message content (will be JSON stringified).
   */
  async sendToQueue(queue: string, message: any): Promise<boolean> {
    try {
      // Ensure the queue exists. If not, declare it.
      if (!this.queues.includes(queue)) {
        await this.channel.assertQueue(queue, { durable: true });
        this.queues.push(queue);
      }

      const success = this.channel.sendToQueue(
        queue,
        Buffer.from(JSON.stringify(message)),
        { persistent: true },
      );

      if (success) {
        this.logger.log(
          `Message sent to queue ${queue}: ${JSON.stringify(message)}`,
        );
      } else {
        this.logger.warn(
          `Failed to send message to queue ${queue} (channel buffer full)`,
        );
      }

      return success;
    } catch (error) {
      this.logger.error(
        `Error sending message to queue ${queue}: ${error.message}`,
      );
      // Attempt to reconnect if connection is lost
      if (
        error.message.includes('channel closed') ||
        error.message.includes('connection closed')
      ) {
        await this.connect();
      }
      return false;
    }
  }

  /**
   * Publish a message to an exchange with a routing key.
   */
  async publishToExchange(
    exchange: string,
    routingKey: string,
    message: any,
  ): Promise<boolean> {
    try {
      // Ensure the exchange exists
      await this.channel.assertExchange(exchange, 'topic', { durable: true });

      const success = this.channel.publish(
        exchange,
        routingKey,
        Buffer.from(JSON.stringify(message)),
        { persistent: true },
      );

      if (success) {
        this.logger.log(
          `Message published to exchange ${exchange} with routing key ${routingKey}`,
        );
      } else {
        this.logger.warn(
          `Failed to publish message to exchange ${exchange} (channel buffer full)`,
        );
      }

      return success;
    } catch (error) {
      this.logger.error(
        `Error publishing message to exchange ${exchange}: ${error.message}`,
      );
      // Attempt to reconnect if connection is lost
      if (
        error.message.includes('channel closed') ||
        error.message.includes('connection closed')
      ) {
        await this.connect();
      }
      return false;
    }
  }
}
