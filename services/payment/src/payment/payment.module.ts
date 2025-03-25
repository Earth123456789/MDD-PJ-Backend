// payment/src/payment/payment.module.ts

import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { VehicleTypeController } from './vehicle-type.controller';
import { QrCodeModule } from '../qrcode/qrcode.module';
import { ClientsModule, Transport, ClientOptions } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PricingModule } from '../pricing/pricing.module';
import { HttpModule } from '@nestjs/axios';
// import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    QrCodeModule,
    PricingModule,
    HttpModule,
    // AuthModule,
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
              queue: `${configService.get<string>('rabbitmq.queuePrefix') || 'payment_service'}_payment`,
              queueOptions: {
                durable: true,
              },
            },
          };
        },
      },
    ]),
  ],
  controllers: [PaymentController, VehicleTypeController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
