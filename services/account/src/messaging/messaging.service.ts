import { Injectable, Inject, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class MessagingService {
  private readonly logger = new Logger(MessagingService.name);

  constructor(
    @Inject('ACCOUNTS_SERVICE') private readonly client: ClientProxy,
  ) {}

  async onApplicationBootstrap() {
    try {
      await this.client.connect();
      this.logger.log('Connected to RabbitMQ');
    } catch (error) {
      this.logger.error(
        `Failed to connect to RabbitMQ: ${error.message}`,
        error.stack,
      );
    }
  }

  async publishEvent(pattern: string, data: any) {
    try {
      this.logger.debug(`Publishing event: ${pattern}`);
      return this.client.emit(pattern, data);
    } catch (error) {
      this.logger.error(
        `Failed to publish event ${pattern}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async sendCommand<T>(pattern: string, data: any): Promise<T> {
    try {
      this.logger.debug(`Sending command: ${pattern}`);
      // Using firstValueFrom instead of toPromise() which is deprecated
      return await firstValueFrom(this.client.send<T, any>(pattern, data));
    } catch (error) {
      this.logger.error(
        `Failed to send command ${pattern}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
