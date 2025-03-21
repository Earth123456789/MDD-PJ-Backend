import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as winston from 'winston';
import * as Transport from 'winston-transport';
import * as WinstonElasticsearch from 'winston-elasticsearch';

@Injectable()
export class LoggingConfigService {
  constructor(private configService: ConfigService) {}

  createWinstonLoggerOptions(): winston.LoggerOptions {
    const transports: Transport[] = [
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
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
      }),
      new winston.transports.File({ filename: 'logs/combined.log' }),
    ];

    // Add Elasticsearch transport in production
    if (this.configService.get('NODE_ENV') === 'production') {
      transports.push(
        new WinstonElasticsearch.ElasticsearchTransport({
          level: 'info',
          clientOpts: {
            node: this.configService.get(
              'ELASTICSEARCH_NODE',
              'http://elasticsearch:9200',
            ),
            auth: {
              username: this.configService.get('ELASTICSEARCH_USERNAME', ''),
              password: this.configService.get('ELASTICSEARCH_PASSWORD', ''),
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
  }

  getPort(): number {
    return this.configService.get<number>('PORT', 3002);
  }
}
