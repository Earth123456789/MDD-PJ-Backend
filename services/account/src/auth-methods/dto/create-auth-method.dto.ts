import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, IsEnum } from 'class-validator';

export class CreateAuthMethodDto {
  @ApiProperty({
    description: 'User ID',
    example: 1,
  })
  @IsNumber()
  @IsNotEmpty()
  userId: number;

  @ApiProperty({
    description: 'Authentication method type',
    example: 'LOCAL',
    enum: ['LOCAL', 'GOOGLE', 'LINE', 'FACEBOOK', 'TWITTER', 'APPLE'],
  })
  @IsString()
  @IsNotEmpty()
  @IsEnum(['LOCAL', 'GOOGLE', 'LINE', 'FACEBOOK', 'TWITTER', 'APPLE'])
  authType: string;

  @ApiProperty({
    description: 'Authentication identifier',
    example: 'john.doe@example.com',
  })
  @IsString()
  @IsNotEmpty()
  authIdentifier: string;
}
