import { Module } from '@nestjs/common';
import { DriverAccountService } from './driver-account.service';
import { DriverAccountController } from './driver-account.controller';
// import { AuthModule } from '../auth/auth.module';

@Module({
  // imports: [AuthModule],
  controllers: [DriverAccountController],
  providers: [DriverAccountService],
  exports: [DriverAccountService],
})
export class DriverAccountModule {}
