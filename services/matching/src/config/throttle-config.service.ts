import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ThrottlerModuleOptions } from '@nestjs/throttler';

@Injectable()
export class ThrottleConfigService {
  constructor(private configService: ConfigService) {}

  createThrottlerOptions(): ThrottlerModuleOptions {
    return {
      throttlers: [
        {
          ttl: this.configService.get<number>('THROTTLE_TTL', 60),
          limit: this.configService.get<number>('THROTTLE_LIMIT', 100),
        },
      ],
    };
  }
}
