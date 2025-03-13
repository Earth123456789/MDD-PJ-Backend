import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateBankAccountDto {
  @ApiProperty({
    description: 'Customer ID',
    example: 1,
  })
  @IsNumber()
  @IsNotEmpty()
  customer_id: number;

  @ApiProperty({
    description: 'Bank account number',
    example: '1234567890',
  })
  @IsString()
  @IsNotEmpty()
  account_number: string;

  @ApiProperty({
    description: 'QR code token (generated automatically if not provided)',
    example: 'abc123token',
    required: false,
  })
  @IsString()
  qr_code_token?: string;
}
