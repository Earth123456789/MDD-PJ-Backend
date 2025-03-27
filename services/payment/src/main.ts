import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { WinstonModule } from 'nest-winston';
import { AppModule } from './app.module';
import { LoggingConfigService } from './config/logging-config.service';

async function bootstrap() {
  try {
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
      .setTitle('Payment Service API')
      .setDescription(
        'API for handling payments, QR code generation, and driver bank accounts',
      )
      .setVersion('1.0')
      .addTag('payments')
      .addTag('qr-codes')
      .addTag('driver-accounts')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token',
        },
        'JWT-auth',
      )
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('/docs', app, document);

    // Start application
    const port = loggingConfigService.getPort();
    console.log(
      'Application created, attempting to listen on port ' + port + '...',
    );
    await app.listen(port);
    console.log(`Payment Service is running on: http://localhost:${port}`);
    console.log(
      `Swagger documentation is available at: http://localhost:${port}/docs`,
    );
  } catch (error) {
    console.error('Failed to start application:', error);
    throw error;
  }
}

bootstrap();
