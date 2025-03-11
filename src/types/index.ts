import { Driver, Vehicle, DriverVehicleAssignment, DriverStatus, VehicleStatus, AssignmentStatus } from '@prisma/client';

// Driver interfaces
export interface DriverLocationResponse {
  id: string;
  name: string;
  location: {
    latitude: number;
    longitude: number;
    lastUpdated: Date | null;
  };
}

export interface DriverStatusUpdateRequest {
  status: DriverStatus;
}

// Vehicle interfaces
export interface VehicleLocationResponse {
  id: string;
  plateNumber: string;
  location: {
    latitude: number;
    longitude: number;
    lastUpdated: Date | null;
  };
}

export interface VehicleStatusUpdateRequest {
  status: VehicleStatus;
}

// Assignment interfaces
export interface AssignmentStatusUpdateRequest {
  status: AssignmentStatus;
}

// Shared interfaces
export interface LocationUpdateRequest {
  latitude: number;
  longitude: number;
}

export type { Driver, Vehicle, DriverVehicleAssignment };

// Export Prisma enums
export { DriverStatus, VehicleStatus, AssignmentStatus };