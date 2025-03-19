import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNumber,
  IsPositive,
  IsOptional,
  IsObject,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OrderStatus } from '@prisma/client';

// Define the location DTOs separately
class UpdateLocationDto {
  @ApiProperty({
    description: 'Latitude',
    example: 13.756331,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  latitude?: number;

  @ApiProperty({
    description: 'Longitude',
    example: 100.501762,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  longitude?: number;

  @ApiProperty({
    description: 'Address',
    example: '123 Main St, Bangkok, Thailand',
    required: false,
  })
  @IsOptional()
  address?: string;

  @ApiProperty({
    description: 'Additional location information',
    example: 'Building A, Floor 3, Room 302',
    required: false,
  })
  @IsOptional()
  details?: string;
}

// Define UpdateOrderDto from scratch rather than extending CreateOrderDto
export class UpdateOrderDto {
  @ApiProperty({
    description: 'User ID',
    example: 1001,
    required: false,
  })
  @IsInt()
  @IsPositive()
  @IsOptional()
  user_id?: number;

  @ApiProperty({
    description: 'Pickup location',
    type: UpdateLocationDto,
    required: false,
  })
  @IsObject()
  @ValidateNested()
  @Type(() => UpdateLocationDto)
  @IsOptional()
  pickup_location?: UpdateLocationDto;

  @ApiProperty({
    description: 'Dropoff location',
    type: UpdateLocationDto,
    required: false,
  })
  @IsObject()
  @ValidateNested()
  @Type(() => UpdateLocationDto)
  @IsOptional()
  dropoff_location?: UpdateLocationDto;

  @ApiProperty({
    description: 'Package weight in kilograms',
    example: 50,
    required: false,
  })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  package_weight_kg?: number;

  @ApiProperty({
    description: 'Package volume in cubic meters',
    example: 2.5,
    required: false,
  })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  package_volume_m3?: number;

  @ApiProperty({
    description: 'Package length in meters',
    example: 1.2,
    required: false,
  })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  package_length_m?: number;

  @ApiProperty({
    description: 'Package width in meters',
    example: 0.8,
    required: false,
  })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  package_width_m?: number;

  @ApiProperty({
    description: 'Package height in meters',
    example: 0.6,
    required: false,
  })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  package_height_m?: number;

  @ApiProperty({
    description: 'Vehicle ID matched',
    example: 1,
    required: false,
  })
  @IsInt()
  @IsPositive()
  @IsOptional()
  vehicle_matched?: number;

  @ApiProperty({
    description: 'Order status',
    enum: OrderStatus,
    required: false,
  })
  @IsEnum(OrderStatus)
  @IsOptional()
  status?: OrderStatus;
}
