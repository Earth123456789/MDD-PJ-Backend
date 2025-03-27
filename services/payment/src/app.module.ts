import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import {
  ElasticsearchModule,
  ElasticsearchModuleOptions,
} from '@nestjs/elasticsearch';
import { ClientsModule, Transport, ClientOptions } from '@nestjs/microservices';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { PaymentModule } from './payment/payment.module';
import { QrCodeModule } from './qrcode/qrcode.module';
import { LoggingConfigModule } from './config/logging-config.module';
// import { AuthModule } from './auth/auth.module';
import { EventsModule } from './events/events.module';
import { HealthModule } from './health/health.module';
import config from './config/configuration';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [config],
    }),

    // Rate limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            ttl: configService.get<number>('throttle.ttl') || 60,
            limit: configService.get<number>('throttle.limit') || 100,
          },
        ],
      }),
    }),

    // Task scheduling
    ScheduleModule.forRoot(),

    // Elasticsearch for logging and search
    ElasticsearchModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (
        configService: ConfigService,
      ): ElasticsearchModuleOptions => {
        const username =
          configService.get<string>('elasticsearch.username') || '';
        const password =
          configService.get<string>('elasticsearch.password') || '';

        return {
          node: configService.get<string>('elasticsearch.node'),
          auth:
            username && password
              ? {
                  username,
                  password,
                }
              : undefined,
        };
      },
    }),

    // RabbitMQ for event communication
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
              queue: `${configService.get<string>('rabbitmq.queuePrefix') || 'payment_service'}_main`,
              queueOptions: {
                durable: true,
              },
            },
          };
        },
      },
    ]),

    // Core modules
    LoggingConfigModule,
    PrismaModule,
    // AuthModule,
    EventsModule,

    // Feature modules
    PaymentModule,
    QrCodeModule,
    HealthModule,
  ],
})
export class AppModule {}
