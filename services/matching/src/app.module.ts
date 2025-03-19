import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerModule, ThrottlerModuleOptions } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import * as WinstonElasticsearch from 'winston-elasticsearch';

import { PrismaModule } from './prisma/prisma.module';
import { VehicleModule } from './modules/vehicle/vehicle.module';
import { OrderModule } from './modules/order/order.module';
import { MatchingModule } from './modules/matching/matching.module';
import { WebsocketModule } from './websocket/websocket.module';
import { QueueModule } from './queue/queue.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),

    // Rate limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService): ThrottlerModuleOptions => ({
        throttlers: [
          {
            ttl: config.get<number>('THROTTLE_TTL', 60),
            limit: config.get<number>('THROTTLE_LIMIT', 100),
          },
        ],
      }),
    }),

    // Event emitter for application events
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 20,
      verboseMemoryLeak: true,
      ignoreErrors: false,
    }),

    // Scheduled tasks
    ScheduleModule.forRoot(),

    // Logging with Winston
    WinstonModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const transports: winston.transport[] = [
          new winston.transports.Console({
            format: winston.format.combine(
              winston.format.timestamp(),
              winston.format.ms(),
              winston.format.colorize(),
              winston.format.printf((info) => {
                return `${info.timestamp} [${info.level}] [${info.context || 'Application'}] - ${info.message}`;
              }),
            ),
          }),
        ];

        // Add Elasticsearch transport in production
        if (configService.get('NODE_ENV') === 'production') {
          transports.push(
            new WinstonElasticsearch.ElasticsearchTransport({
              level: 'info',
              clientOpts: {
                node: configService.get(
                  'ELASTICSEARCH_NODE',
                  'http://elasticsearch:9200',
                ),
                auth: {
                  username: configService.get('ELASTICSEARCH_USERNAME', ''),
                  password: configService.get('ELASTICSEARCH_PASSWORD', ''),
                },
              },
              indexPrefix: 'vehicle-matching-logs',
            }),
          );
        }

        return {
          transports,
          exitOnError: false,
        };
      },
    }),

    // Application modules
    PrismaModule,
    VehicleModule,
    OrderModule,
    MatchingModule,
    WebsocketModule,
    QueueModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
