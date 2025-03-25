// payment/src/pricing/pricing.module.ts

import { Module } from '@nestjs/common';
import { PricingCalculatorService } from './pricing-calculator.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [PricingCalculatorService],
  exports: [PricingCalculatorService],
})
export class PricingModule {}
