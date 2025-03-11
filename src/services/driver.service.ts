import { PrismaClient, Driver, DriverStatus } from '@prisma/client';
import logger from '../utils/logger.util';
import { DriverLocationResponse } from '../types';

const prisma = new PrismaClient();

export const getAllDrivers = async (): Promise<Driver[]> => {
  return prisma.driver.findMany();
};

export const getDriverById = async (id: string): Promise<Driver | null> => {
  return prisma.driver.findUnique({
    where: { id },
  });
};

export const createDriver = async (driverData: Omit<Driver, 'id' | 'createdAt' | 'updatedAt' | 'locationLastUpdated'>): Promise<Driver> => {
  return prisma.driver.create({
    data: driverData,
  });
};

export const updateDriver = async (
  id: string, 
  driverData: Partial<Omit<Driver, 'id' | 'createdAt' | 'updatedAt' | 'locationLastUpdated'>>
): Promise<Driver | null> => {
  // Check if driver exists
  const driver = await prisma.driver.findUnique({
    where: { id },
  });

  if (!driver) {
    return null;
  }

  return prisma.driver.update({
    where: { id },
    data: driverData,
  });
};

export const deleteDriver = async (id: string): Promise<Driver | null> => {
  // Check if driver exists
  const driver = await prisma.driver.findUnique({
    where: { id },
  });

  if (!driver) {
    return null;
  }

  // Check if driver has active assignments
  const activeAssignments = await prisma.driverVehicleAssignment.findFirst({
    where: {
      driverId: id,
      status: 'ACTIVE',
    },
  });

  if (activeAssignments) {
    throw new Error('Cannot delete driver with active assignments');
  }

  return prisma.driver.delete({
    where: { id },
  });
};

export const getDriverLocation = async (id: string): Promise<DriverLocationResponse | null> => {
  const driver = await prisma.driver.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      currentLatitude: true,
      currentLongitude: true,
      locationLastUpdated: true,
    },
  });

  if (!driver || !driver.currentLatitude || !driver.currentLongitude) {
    return null;
  }

  return {
    id: driver.id,
    name: driver.name,
    location: {
      latitude: driver.currentLatitude,
      longitude: driver.currentLongitude,
      lastUpdated: driver.locationLastUpdated,
    },
  };
};

export const updateDriverLocation = async (
  id: string, 
  latitude: number, 
  longitude: number
): Promise<DriverLocationResponse | null> => {
  // Check if driver exists
  const driver = await prisma.driver.findUnique({
    where: { id },
  });

  if (!driver) {
    return null;
  }

  const updatedDriver = await prisma.driver.update({
    where: { id },
    data: {
      currentLatitude: latitude,
      currentLongitude: longitude,
      locationLastUpdated: new Date(),
    },
    select: {
      id: true,
      name: true,
      currentLatitude: true,
      currentLongitude: true,
      locationLastUpdated: true,
    },
  });

  return {
    id: updatedDriver.id,
    name: updatedDriver.name,
    location: {
      latitude: updatedDriver.currentLatitude!,
      longitude: updatedDriver.currentLongitude!,
      lastUpdated: updatedDriver.locationLastUpdated,
    },
  };
};

export const updateDriverStatus = async (id: string, status: DriverStatus): Promise<Driver | null> => {
  // Check if driver exists
  const driver = await prisma.driver.findUnique({
    where: { id },
  });

  if (!driver) {
    return null;
  }

  // Validate status is in enum
  if (!Object.values(DriverStatus).includes(status)) {
    throw new Error(`Invalid status. Must be one of: ${Object.values(DriverStatus).join(', ')}`);
  }

  return prisma.driver.update({
    where: { id },
    data: {
      status,
    },
  });
};