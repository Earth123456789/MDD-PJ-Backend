import { Module } from '@nestjs/common';
import {
  ConfigModule as NestConfigModule,
  ConfigService,
} from '@nestjs/config';
import { ThrottlerModule, ThrottlerModuleOptions } from '@nestjs/throttler';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import * as WinstonElasticsearch from 'winston-elasticsearch';

import { LoggingConfigService } from './logging-config.service';
import { ThrottleConfigService } from './throttle-config.service';

@Module({
  imports: [
    // NestJS Configuration
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),

    // Rate limiting
    ThrottlerModule.forRootAsync({
      imports: [NestConfigModule],
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

    // Logging with Winston
    WinstonModule.forRootAsync({
      imports: [NestConfigModule],
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
  ],
  providers: [LoggingConfigService, ThrottleConfigService],
  exports: [
    NestConfigModule,
    WinstonModule,
    LoggingConfigService,
    ThrottleConfigService,
  ],
})
export class ConfigModule {}
