import { Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { ClientsModule, Transport, ClientOptions } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PaymentModule } from '../payment/payment.module';

@Module({
  imports: [
    PaymentModule,
    ClientsModule.registerAsync([
      {
        name: 'RABBITMQ_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService): ClientOptions => {
          return {
            transport: Transport.RMQ,
            options: {
              urls: [
                configService.get<string>('rabbitmq.url') ||
                  'amqp://localhost:5672',
              ],
              queue: `${configService.get<string>('rabbitmq.queuePrefix') || 'payment_service'}_events`,
              queueOptions: {
                durable: true,
              },
            },
          };
        },
      },
    ]),
  ],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
