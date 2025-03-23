import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsPositive,
  IsOptional,
} from 'class-validator';
import { VehicleType, VehicleStatus } from '@prisma/client';
import { PartialType } from '@nestjs/swagger';
import { CreateVehicleDto } from './create-vehicle.dto';

export class UpdateVehicleDto extends PartialType(CreateVehicleDto) {
  @ApiProperty({
    description: 'Driver ID',
    example: 1001,
    required: false,
  })
  @IsInt()
  @IsPositive()
  @IsOptional()
  driver_id?: number;

  @ApiProperty({
    description: 'Vehicle type',
    enum: VehicleType,
    example: VehicleType.TRUCK,
    required: false,
  })
  @IsEnum(VehicleType)
  @IsOptional()
  vehicle_type?: VehicleType;

  @ApiProperty({
    description: 'Maximum weight capacity in kilograms',
    example: 2000,
    required: false,
  })
  @IsInt()
  @IsPositive()
  @IsOptional()
  max_weight_kg?: number;

  @ApiProperty({
    description: 'Maximum volume capacity in cubic meters',
    example: 15.5,
    required: false,
  })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  max_volume_m3?: number;

  @ApiProperty({
    description: 'Vehicle length in meters',
    example: 6.2,
    required: false,
  })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  length_m?: number;

  @ApiProperty({
    description: 'Vehicle width in meters',
    example: 2.4,
    required: false,
  })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  width_m?: number;

  @ApiProperty({
    description: 'Vehicle height in meters',
    example: 2.8,
    required: false,
  })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  height_m?: number;

  @ApiProperty({
    description: 'Vehicle status',
    enum: VehicleStatus,
    required: false,
  })
  @IsEnum(VehicleStatus)
  @IsOptional()
  status?: VehicleStatus;
}
