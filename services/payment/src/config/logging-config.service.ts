import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { utilities as nestWinstonModuleUtilities } from 'nest-winston';
import * as winston from 'winston';
import { ElasticsearchTransport } from 'winston-elasticsearch';

@Injectable()
export class LoggingConfigService {
  constructor(private configService: ConfigService) {}

  getPort(): number {
    return this.configService.get<number>('port') || 3003;
  }

  getLogLevel(): string {
    return this.configService.get<string>('logging.level') || 'info';
  }

  createWinstonLoggerOptions(): winston.LoggerOptions {
    // Always ensure we have at least a console transport
    const transports: winston.transport[] = [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp(),
          nestWinstonModuleUtilities.format.nestLike('PaymentService', {
            colors: true,
            prettyPrint: true,
          }),
        ),
      }),
    ];

    // Add Elasticsearch transport if configured
    const elasticsearchNode =
      this.configService.get<string>('elasticsearch.node');
    if (elasticsearchNode) {
      transports.push(
        new ElasticsearchTransport({
          level: this.getLogLevel(),
          clientOpts: {
            node: elasticsearchNode,
            auth: {
              username:
                this.configService.get<string>('elasticsearch.username') || '',
              password:
                this.configService.get<string>('elasticsearch.password') || '',
            },
          },
          indexPrefix: 'payment-service-logs',
        }),
      );
    }

    return {
      level: this.getLogLevel(),
      transports,
    };
  }
}
