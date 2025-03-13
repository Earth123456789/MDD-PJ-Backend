import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, Length } from 'class-validator';

export class SmsVerificationDto {
  @ApiProperty({
    description: 'Phone number',
    example: '+1234567890',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^\+?[0-9]+$/, {
    message: 'Phone number must contain only digits',
  })
  phoneNumber: string;

  @ApiProperty({
    description: 'Verification code',
    example: '123456',
  })
  @IsNotEmpty()
  @IsString()
  @Length(6, 6)
  @Matches(/^[0-9]+$/, {
    message: 'Verification code must contain only digits',
  })
  code: string;
}
