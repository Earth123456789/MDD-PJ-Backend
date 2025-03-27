export type VehicleType = 'CAR' | 'VAN' | 'TRUCK' | 'MOTORCYCLE';

export interface FareParams {
  vehicleType: VehicleType;
  distanceKm?: number;
  durationMin?: number;
  surgeMultiplier?: number;
  tollFees?: number;
  otherFees?: number;
}

const baseFareMap: Record<VehicleType, number> = {
  CAR: 35,
  VAN: 50,
  TRUCK: 100,
  MOTORCYCLE: 20,
};

export function calculateFare({
  vehicleType,
  distanceKm,
  durationMin,
  surgeMultiplier = 1,
  tollFees = 0,
  otherFees = 0,
}: FareParams): number {
  const baseFare = baseFareMap[vehicleType];
  const distanceFare = (distanceKm ?? 0) * 7;
  const timeFare = (durationMin ?? 0) * 2;

  const subtotal = baseFare + distanceFare + timeFare;
  const surged = subtotal * surgeMultiplier;

  const total = surged + tollFees + otherFees;

  return Math.round(total); // ปัดเศษเป็นจำนวนเต็ม
}
