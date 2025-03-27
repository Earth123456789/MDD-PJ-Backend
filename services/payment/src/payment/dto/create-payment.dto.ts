import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class CreatePaymentDto {
  @ApiProperty({
    description: 'Order ID',
    example: 'f7cdf6d5-9cb4-4e7d-b4f5-aa90d9c57e9a',
  })
  @IsString()
  @IsNotEmpty()
  order_id: string;

  @ApiProperty({
    description: 'Driver ID (optional)',
    example: 'e1297edf-cfbe-4f96-be4d-78004a2f2df8',
    required: false,
  })
  @IsString()
  @IsOptional()
  driver_id?: string;

  @ApiProperty({
    description: 'Payment method',
    enum: PaymentMethod,
    default: PaymentMethod.QR_CODE,
    required: false,
  })
  @IsEnum(PaymentMethod)
  @IsOptional()
  payment_method?: PaymentMethod;

  @ApiProperty({
    description: 'Amount (optional, will be calculated if not provided)',
    example: 150.5,
    required: false,
  })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  amount?: number;

  @ApiProperty({
    description: 'Currency (optional)',
    example: 'THB',
    default: 'THB',
    required: false,
  })
  @IsString()
  @IsOptional()
  currency?: string;
}