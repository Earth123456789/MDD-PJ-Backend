import { PrismaClient, Vehicle, VehicleStatus } from '@prisma/client';
import logger from '../utils/logger.util';

const prisma = new PrismaClient();

interface VehicleLocationResponse {
  id: string;
  plateNumber: string;
  location: {
    latitude: number;
    longitude: number;
    lastUpdated: Date | null;
  };
}

export const getAllVehicles = async (): Promise<Vehicle[]> => {
  return prisma.vehicle.findMany();
};

export const getVehicleById = async (id: string): Promise<Vehicle | null> => {
  return prisma.vehicle.findUnique({
    where: { id },
  });
};

export const createVehicle = async (vehicleData: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt' | 'locationLastUpdated'>): Promise<Vehicle> => {
  return prisma.vehicle.create({
    data: vehicleData,
  });
};

export const updateVehicle = async (
  id: string, 
  vehicleData: Partial<Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt' | 'locationLastUpdated'>>
): Promise<Vehicle | null> => {
  // Check if vehicle exists
  const vehicle = await prisma.vehicle.findUnique({
    where: { id },
  });

  if (!vehicle) {
    return null;
  }

  return prisma.vehicle.update({
    where: { id },
    data: vehicleData,
  });
};

export const deleteVehicle = async (id: string): Promise<Vehicle | null> => {
  // Check if vehicle exists
  const vehicle = await prisma.vehicle.findUnique({
    where: { id },
  });

  if (!vehicle) {
    return null;
  }

  // Check if vehicle has active assignments
  const activeAssignments = await prisma.driverVehicleAssignment.findFirst({
    where: {
      vehicleId: id,
      status: 'ACTIVE',
    },
  });

  if (activeAssignments) {
    throw new Error('Cannot delete vehicle with active assignments');
  }

  return prisma.vehicle.delete({
    where: { id },
  });
};

export const getVehicleLocation = async (id: string): Promise<VehicleLocationResponse | null> => {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id },
    select: {
      id: true,
      plateNumber: true,
      currentLatitude: true,
      currentLongitude: true,
      locationLastUpdated: true,
    },
  });

  if (!vehicle || !vehicle.currentLatitude || !vehicle.currentLongitude) {
    return null;
  }

  return {
    id: vehicle.id,
    plateNumber: vehicle.plateNumber,
    location: {
      latitude: vehicle.currentLatitude,
      longitude: vehicle.currentLongitude,
      lastUpdated: vehicle.locationLastUpdated,
    },
  };
};

export const updateVehicleLocation = async (
  id: string, 
  latitude: number, 
  longitude: number
): Promise<VehicleLocationResponse | null> => {
  // Check if vehicle exists
  const vehicle = await prisma.vehicle.findUnique({
    where: { id },
  });

  if (!vehicle) {
    return null;
  }

  const updatedVehicle = await prisma.vehicle.update({
    where: { id },
    data: {
      currentLatitude: latitude,
      currentLongitude: longitude,
      locationLastUpdated: new Date(),
    },
    select: {
      id: true,
      plateNumber: true,
      currentLatitude: true,
      currentLongitude: true,
      locationLastUpdated: true,
    },
  });

  return {
    id: updatedVehicle.id,
    plateNumber: updatedVehicle.plateNumber,
    location: {
      latitude: updatedVehicle.currentLatitude!,
      longitude: updatedVehicle.currentLongitude!,
      lastUpdated: updatedVehicle.locationLastUpdated,
    },
  };
};

export const updateVehicleStatus = async (id: string, status: VehicleStatus): Promise<Vehicle | null> => {
  // Check if vehicle exists
  const vehicle = await prisma.vehicle.findUnique({
    where: { id },
  });

  if (!vehicle) {
    return null;
  }

  // Validate status is in enum
  if (!Object.values(VehicleStatus).includes(status)) {
    throw new Error(`Invalid status. Must be one of: ${Object.values(VehicleStatus).join(', ')}`);
  }

  return prisma.vehicle.update({
    where: { id },
    data: {
      status,
    },
  });
};