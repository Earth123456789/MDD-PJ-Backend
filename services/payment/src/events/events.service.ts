import { Injectable, Logger } from '@nestjs/common';
import { Inject, OnModuleInit } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { PaymentService } from '../payment/payment.service';

@Injectable()
export class EventsService implements OnModuleInit {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    @Inject('RABBITMQ_SERVICE') private client: ClientProxy,
    private paymentService: PaymentService,
  ) {}

  async onModuleInit() {
    try {
      await this.client.connect();
      this.logger.log('Connected to RabbitMQ');
    } catch (error) {
      this.logger.error(
        `Failed to connect to RabbitMQ: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Handle 'order.matched' event
   * @param data The event data
   */
  async handleOrderMatched(data: any) {
    try {
      this.logger.log(`Handling order.matched event: ${JSON.stringify(data)}`);
      return await this.paymentService.handleMatchCreated(data);
    } catch (error) {
      this.logger.error(
        `Error handling order.matched event: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Handle 'driver.registered' event
   * @param data The event data
   */
  async handleDriverRegistered(data: any) {
    try {
      this.logger.log(
        `Handling driver.registered event: ${JSON.stringify(data)}`,
      );
      // You could auto-create a default bank account for new drivers here if needed
      return { success: true, message: 'Driver registration acknowledged' };
    } catch (error) {
      this.logger.error(
        `Error handling driver.registered event: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Handle 'order.status.updated' event
   * @param data The event data
   */
  async handleOrderStatusUpdated(data: any) {
    try {
      this.logger.log(
        `Handling order.status.updated event: ${JSON.stringify(data)}`,
      );
      // You could handle specific order status changes here if needed for payment flow
      return { success: true, message: 'Order status update acknowledged' };
    } catch (error) {
      this.logger.error(
        `Error handling order.status.updated event: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Publish an event to RabbitMQ
   */
  async publishEvent(pattern: string, data: any) {
    try {
      this.client.emit(pattern, data);
      this.logger.log(
        `Published event ${pattern} with data: ${JSON.stringify(data)}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to publish event ${pattern}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
