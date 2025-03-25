import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional } from 'class-validator';

export class UpdateDriverAccountDto {
  @ApiPropertyOptional({
    description: 'The name of the bank',
    example: 'Bank of America',
  })
  @IsString()
  @IsOptional()
  bank_name?: string;

  @ApiPropertyOptional({
    description: 'The account number',
    example: '1234567890',
  })
  @IsString()
  @IsOptional()
  account_number?: string;

  @ApiPropertyOptional({
    description: 'The account holder name',
    example: 'John Doe',
  })
  @IsString()
  @IsOptional()
  account_holder?: string;

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
    description: 'Whether this is the default account',
  })
  @IsBoolean()
  @IsOptional()
  is_default?: boolean;

  @ApiPropertyOptional({
    description: 'Whether this account is verified',
  })
  @IsBoolean()
  @IsOptional()
  is_verified?: boolean;
}
