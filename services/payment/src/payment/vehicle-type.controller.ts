// payment/src/payment/vehicle-type.controller.ts

import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { VehicleType } from '../common/enums/vehicle-type.enum';
import { ConfigService } from '@nestjs/config';

@ApiTags('vehicle-types')
@Controller('vehicle-types')
export class VehicleTypeController {
  constructor(private readonly configService: ConfigService) {}

  @Get()
  @ApiOperation({ summary: 'Get all vehicle types supported for pricing' })
  @ApiResponse({
    status: 200,
    description: 'List of supported vehicle types with pricing',
  })
  async getVehicleTypes() {
    const pricingConfig = this.configService.get('pricing');

    // Create vehicle type info with pricing details
    const vehicleTypes = Object.values(VehicleType).map((type) => ({
      type,
      baseFare: pricingConfig?.baseFares?.[type] || 0,
      distanceRate: pricingConfig?.distanceRates?.[type] || 0,
      timeRate: pricingConfig?.timeRates?.[type] || 0,
      description: this.getVehicleDescription(type),
    }));

    return {
      success: true,
      data: vehicleTypes,
      message: 'Vehicle types retrieved successfully',
    };
  }

  private getVehicleDescription(type: VehicleType): string {
    const descriptions = {
      [VehicleType.CAR]: 'Standard car for up to 4 passengers',
      [VehicleType.VAN]: 'Van for larger groups up to 8 passengers',
      [VehicleType.TRUCK]: 'Truck for heavy cargo transport',
      [VehicleType.MOTORCYCLE]: 'Motorcycle for quick small deliveries',
    };

    return descriptions[type] || `${type} vehicle`;
  }
}
