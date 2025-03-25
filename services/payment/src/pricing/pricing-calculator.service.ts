// payment/src/pricing/pricing-calculator.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VehicleType } from 'src/common/enums/vehicle-type.enum';

interface PricingParams {
  vehicleType: VehicleType;
  distanceKm: number;
  estimatedMinutes: number;
  isSurgeTime?: boolean;
  hasTolls?: boolean;
  tollAmount?: number;
}

interface PriceBreakdown {
  baseFare: number;
  distanceFare: number;
  timeFare: number;
  surgeFee: number;
  tollFees: number;
  totalAmount: number;
  currency: string;
}

@Injectable()
export class PricingCalculatorService {
  private readonly logger = new Logger(PricingCalculatorService.name);

  private readonly baseFares: Record<VehicleType, number>;
  private readonly distanceRates: Record<VehicleType, number>;
  private readonly timeRates: Record<VehicleType, number>;
  private readonly surgeMultiplier: number;

  constructor(private configService: ConfigService) {
    // Load pricing configuration from config
    const pricingConfig = this.configService.get('pricing');

    this.baseFares = {
      [VehicleType.CAR]: pricingConfig?.baseFares?.CAR || 40,
      [VehicleType.VAN]: pricingConfig?.baseFares?.VAN || 50,
      [VehicleType.TRUCK]: pricingConfig?.baseFares?.TRUCK || 100,
      [VehicleType.MOTORCYCLE]: pricingConfig?.baseFares?.MOTORCYCLE || 20,
    };

    this.distanceRates = {
      [VehicleType.CAR]: pricingConfig?.distanceRates?.CAR || 7,
      [VehicleType.VAN]: pricingConfig?.distanceRates?.VAN || 9,
      [VehicleType.TRUCK]: pricingConfig?.distanceRates?.TRUCK || 15,
      [VehicleType.MOTORCYCLE]: pricingConfig?.distanceRates?.MOTORCYCLE || 4,
    };

    this.timeRates = {
      [VehicleType.CAR]: pricingConfig?.timeRates?.CAR || 2,
      [VehicleType.VAN]: pricingConfig?.timeRates?.VAN || 2.5,
      [VehicleType.TRUCK]: pricingConfig?.timeRates?.TRUCK || 3,
      [VehicleType.MOTORCYCLE]: pricingConfig?.timeRates?.MOTORCYCLE || 1,
    };

    this.surgeMultiplier = pricingConfig?.surgeMultiplier || 1.5;
  }

  /**
   * Calculate the price based on vehicle type, distance, and time
   */
  calculatePrice(params: PricingParams): PriceBreakdown {
    this.logger.log(
      `Calculating price for ${params.vehicleType} - ${params.distanceKm}km - ${params.estimatedMinutes}min`,
    );

    // Get base fare for vehicle type
    const baseFare =
      this.baseFares[params.vehicleType] || this.baseFares[VehicleType.CAR];

    // Calculate distance fare
    const distanceRate =
      this.distanceRates[params.vehicleType] ||
      this.distanceRates[VehicleType.CAR];
    const distanceFare = params.distanceKm * distanceRate;

    // Calculate time fare
    const timeRate =
      this.timeRates[params.vehicleType] || this.timeRates[VehicleType.CAR];
    const timeFare = params.estimatedMinutes * timeRate;

    // Calculate subtotal
    let subtotal = baseFare + distanceFare + timeFare;

    // Apply surge pricing if applicable
    const surgeFee = params.isSurgeTime
      ? subtotal * (this.surgeMultiplier - 1)
      : 0;

    // Add toll fees if applicable
    const tollFees =
      params.hasTolls && params.tollAmount ? params.tollAmount : 0;

    // Calculate total
    const totalAmount = subtotal + surgeFee + tollFees;

    // Return price breakdown
    return {
      baseFare,
      distanceFare,
      timeFare,
      surgeFee,
      tollFees,
      totalAmount,
      currency: 'THB',
    };
  }

  /**
   * Determine if current time is a surge pricing period
   * Check if current time is within configured peak hours
   */
  isSurgeTime(): boolean {
    const now = new Date();
    const hour = now.getHours();

    const peakHours = this.configService.get('pricing.peakHours');

    // Morning rush or evening rush, based on configuration
    return (
      (hour >= peakHours?.morning?.start && hour <= peakHours?.morning?.end) ||
      (hour >= peakHours?.evening?.start && hour <= peakHours?.evening?.end)
    );
  }

  /**
   * Calculate estimated travel time based on distance
   * This is a simplified example - in production, this would use route APIs
   * @param distanceKm Distance in kilometers
   * @returns Estimated time in minutes
   */
  estimateTravelTime(distanceKm: number): number {
    // Assume average speed of 30 km/h in city traffic
    // Convert to minutes: (distance / speed) * 60
    const estimatedMinutes = (distanceKm / 30) * 60;

    // Add 5 minutes buffer
    return Math.ceil(estimatedMinutes) + 5;
  }
}
