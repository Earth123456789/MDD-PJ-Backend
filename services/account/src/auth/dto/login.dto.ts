import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: 'Email, username, or phone number',
    example: 'john.doe@example.com',
  })
  @IsNotEmpty()
  @IsString()
  identifier: string;

  @ApiProperty({
    description: 'User password',
    example: 'Password123!',
  })
  @IsNotEmpty()
  @IsString()
  password: string;
}
