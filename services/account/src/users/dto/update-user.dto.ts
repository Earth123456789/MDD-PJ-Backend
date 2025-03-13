import { PartialType } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiProperty({
    description: 'User status',
    example: 'active',
    enum: ['active', 'inactive', 'suspended'],
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsEnum(['active', 'inactive', 'suspended'])
  status?: string;
}
