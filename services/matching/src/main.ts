import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { WinstonModule } from 'nest-winston';
import { AppModule } from './app.module';
import { LoggingConfigService } from './config/logging-config.service';

async function bootstrap() {
  // Create a temporary logger for bootstrapping
  const tempLogger = WinstonModule.createLogger({
    transports: [
      // Basic console transport for bootstrap logging
      // Full configuration will be applied after app creation
    ],
  });

  // Create application with basic logging
  const app = await NestFactory.create(AppModule, {
    logger: tempLogger,
  });

  // Get logging config service
  const loggingConfigService = app.get(LoggingConfigService);

  // Apply full logger configuration
  app.useLogger(
    WinstonModule.createLogger(
      loggingConfigService.createWinstonLoggerOptions(),
    ),
  );

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
  const port = loggingConfigService.getPort();
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
  console.log(
    `Swagger documentation is available at: http://localhost:${port}/docs`,
  );
}

bootstrap();
