import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsPositive,
  IsOptional,
  IsObject,
  ValidateNested,
  IsEnum,
  IsString,
  IsNotEmpty,
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
    example: 'e1297edf-cfbe-4f96-be4d-78004a2f2df8',
  })
  @IsString() // Changed from IsInt to IsString
  @IsNotEmpty()
  user_id: string;

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
  @IsNumber()
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

  @ApiProperty({
    description: 'Price of the order in the specified currency. Will be calculated automatically if not provided.',
    example: 1500,
    required: false,
  })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  price?: number;

  @ApiProperty({
    description: 'ID of the vehicle assigned to this order',
    example: 'f7cdf6d5-9cb4-4e7d-b4f5-aa90d9c57e9a',
  })
  @IsString() // Changed from IsInt to IsString
  @IsNotEmpty()
  vehicle_id: string;
}
