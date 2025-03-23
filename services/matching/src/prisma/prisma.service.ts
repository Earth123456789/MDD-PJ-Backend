import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient, Prisma } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor(private configService: ConfigService) {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'info' },
        { emit: 'event', level: 'warn' },
        { emit: 'event', level: 'error' },
      ],
    });
  }

  async onModuleInit() {
    this.logger.log('Connecting to the database...');

    // Add middleware for query logging in development
    if (this.configService.get('NODE_ENV') !== 'production') {
      this.$use(async (params, next) => {
        const before = Date.now();
        const result = await next(params);
        const after = Date.now();
        this.logger.debug(
          `Query ${params.model}.${params.action} took ${after - before}ms`,
        );
        return result;
      });
    }

    // Set up Prisma event listeners.
    (this.$on as any)(
      'query',
      (e: { query: string; params: string; duration: number }) => {
        if (this.configService.get('NODE_ENV') !== 'production') {
          this.logger.debug(`Query: ${e.query}`);
          this.logger.debug(`Params: ${e.params}`);
          this.logger.debug(`Duration: ${e.duration}ms`);
        }
      },
    );

    (this.$on as any)('error', (e: { message: string }) => {
      this.logger.error(`Database error: ${e.message}`);
    });

    try {
      await this.$connect();
      this.logger.log('Successfully connected to the database');
    } catch (error) {
      this.logger.error(`Failed to connect to the database: ${error.message}`);
      throw error;
    }
  }

  async onModuleDestroy() {
    this.logger.log('Disconnecting from the database...');
    await this.$disconnect();
    this.logger.log('Disconnected from the database');
  }

  async cleanDatabase() {
    if (this.configService.get('NODE_ENV') === 'production') {
      throw new Error('Database cleaning is not allowed in production');
    }

    // Dynamically find all model properties that have a deleteMany method.
    const modelNames = Reflect.ownKeys(this).filter((key) => {
      return (
        typeof key === 'string' &&
        !key.startsWith('_') &&
        !key.startsWith('$') &&
        key !== 'constructor' &&
        typeof (this as any)[key] === 'object' &&
        (this as any)[key] !== null &&
        'deleteMany' in (this as any)[key]
      );
    });

    this.logger.warn(`Cleaning database tables: ${modelNames.join(', ')}`);

    // Explicitly type the transaction array as an array of PrismaPromise<any>
    const transaction: Prisma.PrismaPromise<any>[] = [];
    for (const modelName of modelNames) {
      transaction.push(
        (this as any)[modelName].deleteMany() as Prisma.PrismaPromise<any>,
      );
    }

    return this.$transaction(transaction);
  }
}
