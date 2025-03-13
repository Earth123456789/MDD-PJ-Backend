import { registerAs } from '@nestjs/config';

interface DBConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

export default registerAs(
  'database',
  (): DBConfig => ({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'Vipat',
    database: process.env.DB_DATABASE || 'account_db',
  }),
);
