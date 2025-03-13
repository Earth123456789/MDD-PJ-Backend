import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { QrcodeService } from './qrcode.service';
import { QrcodeController } from './qrcode.controller';
import { BankAccountsModule } from '../bank-accounts/bank-accounts.module';

@Module({
  imports: [ConfigModule, BankAccountsModule],
  controllers: [QrcodeController],
  providers: [QrcodeService],
  exports: [QrcodeService],
})
export class QrcodeModule {}
