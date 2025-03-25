// payment/src/pricing/pricing.types.ts

import { VehicleType } from 'src/common/enums/vehicle-type.enum';

export interface PricingParams {
  vehicleType: VehicleType;
  distanceKm: number;
  estimatedMinutes: number;
  isSurgeTime?: boolean;
  hasTolls?: boolean;
  tollAmount?: number;
}

export interface PriceBreakdown {
  baseFare: number;
  distanceFare: number;
  timeFare: number;
  surgeFee: number;
  tollFees: number;
  totalAmount: number;
  currency: string;
}
