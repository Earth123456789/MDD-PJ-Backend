import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNumber,
  IsPositive,
  IsOptional,
  IsObject,
  ValidateNested,
  IsEnum,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OrderStatus } from '@prisma/client';

class LocationDto {
  @ApiProperty({
    description: 'Latitude',
    example: 13.756331,
  })
  @IsNumber()
  latitude: number;

  @ApiProperty({
    description: 'Longitude',
    example: 100.501762,
  })
  @IsNumber()
  longitude: number;

  @ApiProperty({
    description: 'Address',
    example: '123 Main St, Bangkok, Thailand',
  })
  @IsString()
  address: string;

  @ApiProperty({
    description: 'Additional location information',
    example: 'Building A, Floor 3, Room 302',
    required: false,
  })
  @IsOptional()
  @IsString()
  details?: string;
}

export class CreateOrderDto {
  @ApiProperty({
    description: 'User ID',
    example: 1001,
  })
  @IsInt()
  @IsPositive()
  user_id: number;

  @ApiProperty({
    description: 'Pickup location',
    type: LocationDto,
  })
  @IsObject()
  @ValidateNested()
  @Type(() => LocationDto)
  pickup_location: LocationDto;

  @ApiProperty({
    description: 'Dropoff location',
    type: LocationDto,
  })
  @IsObject()
  @ValidateNested()
  @Type(() => LocationDto)
  dropoff_location: LocationDto;

  @ApiProperty({
    description: 'Package weight in kilograms',
    example: 50,
  })
  @IsInt()
  @IsPositive()
  package_weight_kg: number;

  @ApiProperty({
    description: 'Package volume in cubic meters',
    example: 2.5,
  })
  @IsNumber()
  @IsPositive()
  package_volume_m3: number;

  @ApiProperty({
    description: 'Package length in meters',
    example: 1.2,
  })
  @IsNumber()
  @IsPositive()
  package_length_m: number;

  @ApiProperty({
    description: 'Package width in meters',
    example: 0.8,
  })
  @IsNumber()
  @IsPositive()
  package_width_m: number;

  @ApiProperty({
    description: 'Package height in meters',
    example: 0.6,
  })
  @IsNumber()
  @IsPositive()
  package_height_m: number;

  @ApiProperty({
    description: 'Order status',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
    required: false,
  })
  @IsEnum(OrderStatus)
  @IsOptional()
  status?: OrderStatus;
}
