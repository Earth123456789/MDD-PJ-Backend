import { PrismaClient, Driver, DriverStatus } from "@prisma/client";
import logger from "../utils/logger.util";
import { DriverLocationResponse } from "../types";

const prisma = new PrismaClient();

export const getAllDrivers = async (): Promise<Driver[]> => {
  return prisma.driver.findMany();
};

export const getDriverById = async (id: number): Promise<Driver | null> => {
  return prisma.driver.findUnique({
    where: {
      driver_id: id, 
    },
  });
};

export const createDriver = async (
  driverData: Omit<
    Driver,
    "driver_id" | "createdAt" | "updatedAt" | "locationLastUpdated"
  >,
): Promise<Driver> => {
  return prisma.driver.create({
    data: driverData,
  });
};

export const updateDriver = async (
  id: number,
  driverData: Partial<
    Omit<
      Driver,
      "driver_id" | "createdAt" | "updatedAt" | "locationLastUpdated"
    >
  >,
): Promise<Driver | null> => {
  const driver = await prisma.driver.findUnique({
    where: { driver_id: id },  // Use `driver_id` instead of `id`
  });

  if (!driver) {
    return null;
  }

  return prisma.driver.update({
    where: { driver_id: id },  // Use `driver_id` instead of `id`
    data: driverData,
  });
};

export const deleteDriver = async (id: number): Promise<Driver | null> => {
  const driver = await prisma.driver.findUnique({
    where: { driver_id: id },  // Use `driver_id` instead of `id`
  });

  if (!driver) {
    return null;
  }

  const activeAssignments = await prisma.driverVehicleAssignment.findFirst({
    where: {
      driverId: id,  // Assuming `driverId` is the correct field name in `driverVehicleAssignment`
      status: "ACTIVE",
    },
  });

  if (activeAssignments) {
    throw new Error("Cannot delete driver with active assignments");
  }

  return prisma.driver.delete({
    where: { driver_id: id },  // Use `driver_id` instead of `id`
  });
};

export const getDriverLocation = async (
  id: number,
): Promise<DriverLocationResponse | null> => {
  const driver = await prisma.driver.findUnique({
    where: { driver_id: id },  // Use `driver_id` instead of `id`
    select: {
      driver_id: true,  // Adjust according to your schema, assuming the field is `driver_id`
      name: true,
      currentLatitude: true,
      currentLongitude: true,
      locationLastUpdated: true,
    },
  });

  if (
    !driver ||
    driver.currentLatitude === null ||
    driver.currentLongitude === null
  ) {
    return null;
  }

  return {
    id: driver.driver_id.toString(),  // Assuming `driver_id` is the correct field
    name: driver.name,
    location: {
      latitude: driver.currentLatitude,
      longitude: driver.currentLongitude,
      lastUpdated: driver.locationLastUpdated,
    },
  };
};

export const updateDriverLocation = async (
  id: number,
  latitude: number,
  longitude: number,
): Promise<DriverLocationResponse | null> => {
  const driver = await prisma.driver.findUnique({
    where: { driver_id: id },  // Use `driver_id` instead of `id`
  });

  if (!driver) {
    return null;
  }

  const updatedDriver = await prisma.driver.update({
    where: { driver_id: id },  // Use `driver_id` instead of `id`
    data: {
      currentLatitude: latitude,
      currentLongitude: longitude,
      locationLastUpdated: new Date(),
    },
    select: {
      driver_id: true,  // Adjust according to your schema, assuming the field is `driver_id`
      name: true,
      currentLatitude: true,
      currentLongitude: true,
      locationLastUpdated: true,
    },
  });

  return {
    id: updatedDriver.driver_id.toString(),  // Assuming `driver_id` is the correct field
    name: updatedDriver.name,
    location: {
      latitude: updatedDriver.currentLatitude!,
      longitude: updatedDriver.currentLongitude!,
      lastUpdated: updatedDriver.locationLastUpdated,
    },
  };
};

export const updateDriverStatus = async (
  id: number,
  status: DriverStatus,
): Promise<Driver | null> => {
  const driver = await prisma.driver.findUnique({
    where: { driver_id: id },  // Use `driver_id` instead of `id`
  });

  if (!driver) {
    return null;
  }

  if (!Object.values(DriverStatus).includes(status)) {
    throw new Error(
      `Invalid status. Must be one of: ${Object.values(DriverStatus).join(", ")}`
    );
  }

  return prisma.driver.update({
    where: { driver_id: id },  // Use `driver_id` instead of `id`
    data: {
      status,
    },
  });
};
