import { PrismaClient, Vehicle, VehicleStatus } from "@prisma/client";
import logger from "../utils/logger.util";

const prisma = new PrismaClient();

interface VehicleLocationResponse {
  id: number;
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

export const getVehicleById = async (id: number): Promise<Vehicle | null> => {
  return prisma.vehicle.findUnique({
    where: { vehicle_id: id },
  });
};

export const createVehicle = async (
  vehicleData: Omit<
    Vehicle,
    "vehicle_id" | "createdAt" | "updatedAt" | "locationLastUpdated"
  >,
): Promise<Vehicle> => {
  return prisma.vehicle.create({
    data: vehicleData,
  });
};

export const updateVehicle = async (
  id: number,
  vehicleData: Partial<
    Omit<
      Vehicle,
      "vehicle_id" | "createdAt" | "updatedAt" | "locationLastUpdated"
    >
  >,
): Promise<Vehicle | null> => {
  const vehicle = await prisma.vehicle.findUnique({
    where: { vehicle_id: id },
  });

  if (!vehicle) {
    throw new Error(`Vehicle with ID ${id} not found`);
  }

  return prisma.vehicle.update({
    where: { vehicle_id: id },
    data: vehicleData,
  });
};

export const deleteVehicle = async (id: number): Promise<Vehicle | null> => {
  const vehicle = await prisma.vehicle.findUnique({
    where: { vehicle_id: id },
  });

  if (!vehicle) {
    throw new Error(`Vehicle with ID ${id} not found`);
  }

  const activeAssignments = await prisma.driverVehicleAssignment.findFirst({
    where: {
      vehicleId: id,
      status: "ACTIVE",
    },
  });

  if (activeAssignments) {
    throw new Error("Cannot delete vehicle with active assignments");
  }

  return prisma.vehicle.delete({
    where: { vehicle_id: id },
  });
};

export const getVehicleLocation = async (
  id: number,
): Promise<VehicleLocationResponse | null> => {
  const vehicle = await prisma.vehicle.findUnique({
    where: { vehicle_id: id },
    select: {
      vehicle_id: true,
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
    id: vehicle.vehicle_id,
    plateNumber: vehicle.plateNumber,
    location: {
      latitude: vehicle.currentLatitude,
      longitude: vehicle.currentLongitude,
      lastUpdated: vehicle.locationLastUpdated,
    },
  };
};

export const updateVehicleLocation = async (
  id: number,
  latitude: number,
  longitude: number,
): Promise<VehicleLocationResponse | null> => {
  const vehicle = await prisma.vehicle.findUnique({
    where: { vehicle_id: id },
  });

  if (!vehicle) {
    throw new Error(`Vehicle with ID ${id} not found`);
  }

  const updatedVehicle = await prisma.vehicle.update({
    where: { vehicle_id: id },
    data: {
      currentLatitude: latitude,
      currentLongitude: longitude,
      locationLastUpdated: new Date(),
    },
    select: {
      vehicle_id: true,
      plateNumber: true,
      currentLatitude: true,
      currentLongitude: true,
      locationLastUpdated: true,
    },
  });

  return {
    id: updatedVehicle.vehicle_id,
    plateNumber: updatedVehicle.plateNumber,
    location: {
      latitude: updatedVehicle.currentLatitude!,
      longitude: updatedVehicle.currentLongitude!,
      lastUpdated: updatedVehicle.locationLastUpdated,
    },
  };
};

export const updateVehicleStatus = async (
  id: number,
  status: VehicleStatus,
): Promise<Vehicle | null> => {
  const vehicle = await prisma.vehicle.findUnique({
    where: { vehicle_id: id },
  });

  if (!vehicle) {
    throw new Error(`Vehicle with ID ${id} not found`);
  }

  if (!Object.values(VehicleStatus).includes(status)) {
    throw new Error(
      `Invalid status. Must be one of: ${Object.values(VehicleStatus).join(", ")}`,
    );
  }

  return prisma.vehicle.update({
    where: { vehicle_id: id },
    data: { status },
  });
};
