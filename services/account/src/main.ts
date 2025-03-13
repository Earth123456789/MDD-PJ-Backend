import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Get configuration
  const port = configService.get<number>('PORT', 3001);

  // Enable CORS
  app.enableCors();

  // Setup global validation pipe
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
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Accounts Service API')
    .setDescription('API documentation for the Accounts Service')
    .setVersion('1.0')
    .addTag('auth', 'Authentication endpoints')
    .addTag('users', 'User management endpoints')
    .addTag('roles', 'Role management endpoints')
    .addTag('customers', 'Customer management endpoints')
    .addTag('bank-accounts', 'Bank account management endpoints')
    .addTag('billing', 'Billing management endpoints')
    .addTag('qrcode', 'QR code generation endpoints')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(`/docs`, app, document);

  await app.listen(port);
  console.log(
    `Application is running on: http://localhost:${port}`,
  );
  console.log(
    `Swagger documentation is available at: http://localhost:${port}/docs`,
  );
}

bootstrap();
