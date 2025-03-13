import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsObject, IsOptional } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({
    description: 'Role name',
    example: 'admin',
  })
  @IsNotEmpty()
  @IsString()
  role_name: string;

  @ApiProperty({
    description: 'Role description',
    example: 'Administrator with full access',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Role permissions',
    example: {
      users: ['create', 'read', 'update', 'delete'],
      roles: ['read'],
    },
    required: false,
  })
  @IsOptional()
  @IsObject()
  permissions?: Record<string, any>;
}
