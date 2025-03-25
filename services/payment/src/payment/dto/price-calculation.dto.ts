// payment/src/payment/dto/price-calculation.dto.ts

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsBoolean, IsOptional } from 'class-validator';
import { VehicleType } from 'src/common/enums/vehicle-type.enum';

export class PriceCalculationRequestDto {
  @ApiProperty({
    description: 'The type of vehicle for the delivery',
    enum: VehicleType,
    example: VehicleType.CAR,
  })
  @IsEnum(VehicleType)
  vehicleType: VehicleType;

  @ApiProperty({
    description: 'Travel distance in kilometers',
    example: 15.2,
  })
  @IsNumber()
  distanceKm: number;

  @ApiProperty({
    description: 'Estimated travel time in minutes',
    example: 35,
  })
  @IsNumber()
  estimatedMinutes: number;

  @ApiPropertyOptional({
    description: 'Whether the calculation is during surge pricing period',
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  isSurgeTime?: boolean;

  @ApiPropertyOptional({
    description: 'Whether the route includes toll roads',
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  hasTolls?: boolean;

  @ApiPropertyOptional({
    description: 'Total toll charges if applicable (in THB)',
    example: 70,
  })
  @IsNumber()
  @IsOptional()
  tollAmount?: number;
}

export class PriceBreakdownResponseDto {
  @ApiProperty({
    description: 'Base fare for the vehicle type (in THB)',
    example: 40,
  })
  baseFare: number;

  @ApiProperty({
    description: 'Distance-based fare component (in THB)',
    example: 106.4,
  })
  distanceFare: number;

  @ApiProperty({
    description: 'Time-based fare component (in THB)',
    example: 70,
  })
  timeFare: number;

  @ApiProperty({
    description: 'Additional surge fee if applicable (in THB)',
    example: 0,
  })
  surgeFee: number;

  @ApiProperty({
    description: 'Toll fees if applicable (in THB)',
    example: 0,
  })
  tollFees: number;

  @ApiProperty({
    description: 'Total fare amount (in THB)',
    example: 216.4,
  })
  totalAmount: number;

  @ApiProperty({
    description: 'Currency code',
    example: 'THB',
  })
  currency: string;
}

export class PriceCalculationResponseDto {
  @ApiProperty({
    description: 'Order ID',
    example: 12345,
  })
  order_id: number;

  @ApiProperty({
    description: 'Vehicle type',
    enum: VehicleType,
    example: VehicleType.CAR,
  })
  vehicle_type: VehicleType;

  @ApiProperty({
    description: 'Distance in kilometers',
    example: 15.2,
  })
  distance_km: number;

  @ApiProperty({
    description: 'Estimated travel time in minutes',
    example: 35,
  })
  estimated_minutes: number;

  @ApiProperty({
    description: 'Whether the calculation is during surge pricing period',
    example: false,
  })
  is_surge_time: boolean;

  @ApiProperty({
    description: 'Detailed price breakdown',
    type: PriceBreakdownResponseDto,
  })
  price_details: PriceBreakdownResponseDto;
}
