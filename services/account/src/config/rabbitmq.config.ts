import { registerAs } from '@nestjs/config';

interface RabbitMQConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  queue: string;
}

export default registerAs(
  'rabbitmq',
  (): RabbitMQConfig => ({
    host: process.env.RABBITMQ_HOST || 'rabbitmq',
    port: Number(process.env.RABBITMQ_PORT) || 5672,
    username: process.env.RABBITMQ_USERNAME || 'guest',
    password: process.env.RABBITMQ_PASSWORD || 'guest',
    queue: process.env.RABBITMQ_QUEUE || 'accounts_queue',
  }),
);
