import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsString,
  IsNotEmpty,
  IsBoolean,
  IsOptional,
} from 'class-validator';

export class CreateDriverAccountDto {
  @ApiProperty({
    description: 'The ID of the driver',
    example: 1,
  })
  @IsNumber()
  @IsNotEmpty()
  driver_id: number;

  @ApiProperty({
    description: 'The name of the bank',
    example: 'Bank of America',
  })
  @IsString()
  @IsNotEmpty()
  bank_name: string;

  @ApiProperty({
    description: 'The account number',
    example: '1234567890',
  })
  @IsString()
  @IsNotEmpty()
  account_number: string;

  @ApiProperty({
    description: 'The account holder name',
    example: 'John Doe',
  })
  @IsString()
  @IsNotEmpty()
  account_holder: string;

  @ApiPropertyOptional({
    description: 'The routing number',
    example: '987654321',
  })
  @IsString()
  @IsOptional()
  routing_number?: string;

  @ApiPropertyOptional({
    description: 'The SWIFT code for international transfers',
    example: 'BOFAUS3N',
  })
  @IsString()
  @IsOptional()
  swift_code?: string;

  @ApiPropertyOptional({
    description: 'The account currency',
    example: 'THB',
    default: 'THB',
  })
  @IsString()
  @IsOptional()
  currency?: string = 'THB';

  @ApiPropertyOptional({
    description: 'Whether this is the default account',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  is_default?: boolean = true;
}
