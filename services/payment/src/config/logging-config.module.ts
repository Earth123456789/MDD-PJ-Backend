import { Module } from '@nestjs/common';
import { LoggingConfigService } from './logging-config.service';

@Module({
  providers: [LoggingConfigService],
  exports: [LoggingConfigService],
})
export class LoggingConfigModule {}
