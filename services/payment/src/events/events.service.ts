// src/events/events.service.ts

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PaymentService } from '../payment/payment.service';
import * as amqp from 'amqplib';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EventsService implements OnModuleInit, OnModuleDestroy {
  private connection: amqp.Connection;
  private channel: amqp.Channel;
  private readonly logger = new Logger(EventsService.name);
  private readonly queues = ['order-matched', 'order-status-changed'];

  constructor(
    private readonly configService: ConfigService,
    private readonly paymentService: PaymentService,
  ) {}

  async onModuleInit() {
    const rabbitUrl = this.configService.get<string>('RABBITMQ_URL') || 'amqp://localhost:5672';
    try {
      this.logger.log(`Connecting to RabbitMQ at ${rabbitUrl}`);
      this.connection = await amqp.connect(rabbitUrl);
      this.channel = await this.connection.createChannel();

      for (const queue of this.queues) {
        await this.channel.assertQueue(queue, { durable: true });
        this.logger.log(`✅ Queue ready: ${queue}`);
      }

      await this.setupConsumers();
    } catch (err) {
      this.logger.error(`❌ Failed to connect to RabbitMQ: ${err.message}`);
    }
  }

  async onModuleDestroy() {
    await this.channel?.close();
    await this.connection?.close();
    this.logger.log('🔌 RabbitMQ connection closed');
  }

  private async setupConsumers() {
    this.channel.consume('order-matched', async (msg) => {
      if (msg) {
        try {
          const data = JSON.parse(msg.content.toString());
          this.logger.log(`📦 [order-matched] ${JSON.stringify(data)}`);
          await this.paymentService.handleMatchCreated(data);
          this.channel.ack(msg);
        } catch (err) {
          this.logger.error(`❌ Failed to process order-matched: ${err.message}`);
          this.channel.nack(msg, false, false);
        }
      }
    });
  }

  async publishEvent(queue: string, data: any) {
    try {
      await this.channel.assertQueue(queue, { durable: true });
      this.channel.sendToQueue(queue, Buffer.from(JSON.stringify(data)), { persistent: true });
      this.logger.log(`📤 Sent to queue "${queue}": ${JSON.stringify(data)}`);
    } catch (err) {
      this.logger.error(`❌ Failed to publish to ${queue}: ${err.message}`);
    }
  }
}
