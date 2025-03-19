import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import * as Transport from 'winston-transport';
import * as WinstonElasticsearch from 'winston-elasticsearch';

async function bootstrap() {
  // Configure logging
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
  ];

  // Add Elasticsearch transport in production
  if (process.env.NODE_ENV === 'production') {
    transports.push(
      new WinstonElasticsearch.ElasticsearchTransport({
        level: 'info',
        clientOpts: {
          node: process.env.ELASTICSEARCH_NODE || 'http://elasticsearch:9200',
          auth: {
            username: process.env.ELASTICSEARCH_USERNAME || '',
            password: process.env.ELASTICSEARCH_PASSWORD || '',
          },
        },
        indexPrefix: 'vehicle-matching-logs',
      }),
    );
  }

  // Create application with logging
  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger({
      transports,
      exitOnError: false,
    }),
  });

  // Get config service
  const configService = app.get(ConfigService);

  // Enable CORS
  app.enableCors();

  // Enable validation pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Setup Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Vehicle Matching API')
    .setDescription(
      'API for matching vehicles with orders, including WebSocket events',
    )
    .setVersion('1.0')
    .addTag('vehicles')
    .addTag('orders')
    .addTag('matching')
    .addTag('WebSockets')
    .addTag('WebSocket Documentation')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('/docs', app, document);

  // Start application
  const port = configService.get<number>('PORT', 3002);
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
  console.log(
    `Swagger documentation is available at: http://localhost:${port}/docs`,
  );
}

bootstrap();
