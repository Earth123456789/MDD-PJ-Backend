import { Module } from '@nestjs/common';
import { QrCodeService } from './qrcode.service';
import { QrCodeController } from './qrcode.controller';
import { ClientsModule, Transport, ClientOptions } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: 'RABBITMQ_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService): ClientOptions => {
          return {
            transport: Transport.RMQ,
            options: {
              urls: [configService.get<string>('rabbitmq.url') || 'amqp://localhost:5672'],
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
  providers: [QrCodeService],
  controllers: [QrCodeController],
  exports: [QrCodeService],
})
export class QrCodeModule {}