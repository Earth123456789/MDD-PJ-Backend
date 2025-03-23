import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsPositive,
  IsOptional,
  Min,
} from 'class-validator';
import { VehicleType, VehicleStatus } from '@prisma/client';

export class CreateVehicleDto {
  @ApiProperty({
    description: 'Driver ID',
    example: 1001,
  })
  @IsInt()
  @IsPositive()
  driver_id: number;

  @ApiProperty({
    description: 'Vehicle type',
    enum: VehicleType,
    example: VehicleType.TRUCK,
  })
  @IsEnum(VehicleType)
  vehicle_type: VehicleType;

  @ApiProperty({
    description: 'Maximum weight capacity in kilograms',
    example: 2000,
  })
  @IsInt()
  @IsPositive()
  max_weight_kg: number;

  @ApiProperty({
    description: 'Maximum volume capacity in cubic meters',
    example: 15.5,
  })
  @IsNumber()
  @IsPositive()
  max_volume_m3: number;

  @ApiProperty({
    description: 'Vehicle length in meters',
    example: 6.2,
  })
  @IsNumber()
  @IsPositive()
  length_m: number;

  @ApiProperty({
    description: 'Vehicle width in meters',
    example: 2.4,
  })
  @IsNumber()
  @IsPositive()
  width_m: number;

  @ApiProperty({
    description: 'Vehicle height in meters',
    example: 2.8,
  })
  @IsNumber()
  @IsPositive()
  height_m: number;

  @ApiProperty({
    description: 'Vehicle status',
    enum: VehicleStatus,
    default: VehicleStatus.AVAILABLE,
    required: false,
  })
  @IsEnum(VehicleStatus)
  @IsOptional()
  status?: VehicleStatus;
}
