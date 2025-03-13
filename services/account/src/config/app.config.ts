import { registerAs } from '@nestjs/config';

interface AppConfig {
  nodeEnv: string;
  port: number;
  apiPrefix: string;
}

export default registerAs(
  'app',
  (): AppConfig => ({
    nodeEnv: process.env.NODE_ENV || 'development',
    port: Number(process.env.PORT) || 3000,
    apiPrefix: process.env.API_PREFIX || 'api',
  }),
);
