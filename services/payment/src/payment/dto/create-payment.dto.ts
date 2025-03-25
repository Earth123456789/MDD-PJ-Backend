import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class CreatePaymentDto {
  @ApiProperty({
    description: 'The ID of the order',
    example: 1,
  })
  @IsNumber()
  @IsNotEmpty()
  order_id: number;

  @ApiProperty({
    description: 'The payment amount in Thai Baht (THB)',
    example: 3500.0,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  amount?: number;

  @ApiPropertyOptional({
    description: 'The payment method',
    enum: PaymentMethod,
    default: PaymentMethod.QR_CODE,
  })
  @IsEnum(PaymentMethod)
  @IsOptional()
  payment_method?: PaymentMethod;

  @ApiPropertyOptional({
    description: 'The ID of the driver',
    example: 1,
  })
  @IsNumber()
  @IsOptional()
  driver_id?: number;
}
