import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule, Transport } from '@nestjs/microservices';
import * as Joi from 'joi';

// Configuration imports
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import authConfig from './config/auth.config';
import rabbitmqConfig from './config/rabbitmq.config';

// Module imports (each import should appear only once)
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { CustomersModule } from './customers/customers.module';
import { BankAccountsModule } from './bank-accounts/bank-accounts.module';
import { BillingModule } from './billing/billing.module';
import { AuthMethodsModule } from './auth-methods/auth-methods.module';
import { SmsModule } from './sms/sms.module';
import { QrcodeModule } from './qrcode/qrcode.module';
import { MessagingModule } from './messaging/messaging.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, authConfig, rabbitmqConfig],
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .default('development'),
        PORT: Joi.number().default(3000),
        DB_HOST: Joi.string().required(),
        DB_PORT: Joi.number().default(5432),
        DB_USERNAME: Joi.string().required(),
        DB_PASSWORD: Joi.string().required(),
        DB_DATABASE: Joi.string().required(),
        JWT_SECRET: Joi.string().default('dev-jwt-secret'),
        JWT_EXPIRATION: Joi.string().default('1d'),
        JWT_REFRESH_SECRET: Joi.string().default('dev-jwt-refresh-secret'),
        JWT_REFRESH_EXPIRATION: Joi.string().default('7d'),
        GOOGLE_CLIENT_ID: Joi.string().optional().default('dummy-google-client-id'),
        GOOGLE_CLIENT_SECRET: Joi.string().optional().default('dummy-google-client-secret'),
        GOOGLE_CALLBACK_URL: Joi.string().default('http://localhost:3000/api/auth/google/callback'),
        RABBITMQ_HOST: Joi.string().default('localhost'),
        RABBITMQ_PORT: Joi.number().default(5672),
        RABBITMQ_USERNAME: Joi.string().default('guest'),
        RABBITMQ_PASSWORD: Joi.string().default('guest'),
        RABBITMQ_QUEUE: Joi.string().default('accounts_queue'),
        TWILIO_ACCOUNT_SID: Joi.string().optional().default('dummy-twilio-sid'),
        TWILIO_AUTH_TOKEN: Joi.string().optional().default('dummy-twilio-token'),
        TWILIO_PHONE_NUMBER: Joi.string().optional().default('+12345678901'),
      }),
    }),

    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST'),
        port: configService.get('DB_PORT'),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_DATABASE'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: configService.get('NODE_ENV') !== 'production',
        logging: configService.get('NODE_ENV') === 'development',
      }),
    }),

    // RabbitMQ
    ClientsModule.registerAsync([
      {
        name: 'ACCOUNTS_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [
              `amqp://${configService.get('RABBITMQ_USERNAME')}:${configService.get('RABBITMQ_PASSWORD')}@${configService.get('RABBITMQ_HOST')}:${configService.get('RABBITMQ_PORT')}`,
            ],
            queue: configService.get('RABBITMQ_QUEUE'),
            queueOptions: {
              durable: true,
            },
          },
        }),
      },
    ]),

    // Feature modules
    AuthModule,
    UsersModule,
    RolesModule,
    CustomersModule,
    BankAccountsModule,
    BillingModule,
    AuthMethodsModule,
    SmsModule,
    QrcodeModule,
    MessagingModule,
  ],
})
export class AppModule {}
