import {
  PrismaClient,
  DriverVehicleAssignment,
  AssignmentStatus,
  DriverStatus,
  VehicleStatus,
} from "@prisma/client";
import logger from "../utils/logger.util";

const prisma = new PrismaClient();

export const getAllAssignments = async (): Promise<
  DriverVehicleAssignment[]
> => {
  return prisma.driverVehicleAssignment.findMany({
    include: {
      driver: {
        select: {
          driver_id: true,
          name: true,
          status: true,
        },
      },
      vehicle: {
        select: {
          vehicle_id: true,
          plateNumber: true,
          type: true,
          status: true,
        },
      },
    },
  });
};

export const getAssignmentById = async (
  id: number,
): Promise<DriverVehicleAssignment | null> => {
  return prisma.driverVehicleAssignment.findUnique({
    where: { assignment_id: id },
    include: {
      driver: {
        select: {
          driver_id: true,
          name: true,
          status: true,
          currentLatitude: true,
          currentLongitude: true,
        },
      },
      vehicle: {
        select: {
          vehicle_id: true,
          plateNumber: true,
          type: true,
          status: true,
          capacity: true,
          length: true,
          width: true,
          height: true,
        },
      },
    },
  });
};

export const createAssignment = async (
  driverId: number,
  vehicleId: number,
): Promise<DriverVehicleAssignment> => {
  const driver = await prisma.driver.findUnique({
    where: { driver_id: driverId },
  });
  if (!driver) throw new Error("Driver not found");

  const vehicle = await prisma.vehicle.findUnique({
    where: { vehicle_id: vehicleId },
  });
  if (!vehicle) throw new Error("Vehicle not found");

  if (driver.status !== DriverStatus.AVAILABLE)
    throw new Error("Driver is not available");
  if (vehicle.status !== VehicleStatus.AVAILABLE)
    throw new Error("Vehicle is not available");

  const activeDriverAssignment = await prisma.driverVehicleAssignment.findFirst(
    {
      where: { driverId, status: AssignmentStatus.ACTIVE },
    },
  );
  if (activeDriverAssignment)
    throw new Error("Driver already has an active assignment");

  const activeVehicleAssignment =
    await prisma.driverVehicleAssignment.findFirst({
      where: { vehicleId, status: AssignmentStatus.ACTIVE },
    });
  if (activeVehicleAssignment)
    throw new Error("Vehicle already has an active assignment");

  return prisma.$transaction(async (tx) => {
    await tx.driver.update({
      where: { driver_id: driverId },
      data: { status: DriverStatus.BUSY },
    });

    await tx.vehicle.update({
      where: { vehicle_id: vehicleId },
      data: { status: VehicleStatus.IN_USE },
    });

    return tx.driverVehicleAssignment.create({
      data: {
        driverId,
        vehicleId,
        status: AssignmentStatus.ACTIVE,
      },
      include: {
        driver: { select: { driver_id: true, name: true, status: true } },
        vehicle: {
          select: {
            vehicle_id: true,
            plateNumber: true,
            type: true,
            status: true,
          },
        },
      },
    });
  });
};

export const updateAssignmentStatus = async (
  id: number,
  status: AssignmentStatus,
): Promise<DriverVehicleAssignment | null> => {
  const assignment = await prisma.driverVehicleAssignment.findUnique({
    where: { assignment_id: id },
    include: { driver: true, vehicle: true },
  });
  if (!assignment) return null;

  if (!Object.values(AssignmentStatus).includes(status)) {
    throw new Error(
      `Invalid status. Must be one of: ${Object.values(AssignmentStatus).join(", ")}`,
    );
  }

  if (
    status === AssignmentStatus.COMPLETED ||
    status === AssignmentStatus.CANCELLED
  ) {
    return prisma.$transaction(async (tx) => {
      await tx.driver.update({
        where: { driver_id: assignment.driverId },
        data: { status: DriverStatus.AVAILABLE },
      });

      await tx.vehicle.update({
        where: { vehicle_id: assignment.vehicleId },
        data: { status: VehicleStatus.AVAILABLE },
      });

      return tx.driverVehicleAssignment.update({
        where: { assignment_id: id },
        data: { status },
        include: {
          driver: { select: { driver_id: true, name: true, status: true } },
          vehicle: {
            select: {
              vehicle_id: true,
              plateNumber: true,
              type: true,
              status: true,
            },
          },
        },
      });
    });
  } else {
    return prisma.driverVehicleAssignment.update({
      where: { assignment_id: id },
      data: { status },
      include: {
        driver: { select: { driver_id: true, name: true, status: true } },
        vehicle: {
          select: {
            vehicle_id: true,
            plateNumber: true,
            type: true,
            status: true,
          },
        },
      },
    });
  }
};

export const getAssignmentsByDriver = async (
  driverId: number,
): Promise<DriverVehicleAssignment[]> => {
  return prisma.driverVehicleAssignment.findMany({
    where: { driverId },
    include: {
      driver: { select: { driver_id: true, name: true, status: true } },
      vehicle: {
        select: {
          vehicle_id: true,
          plateNumber: true,
          type: true,
          status: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
};

export const getAssignmentsByVehicle = async (
  vehicleId: number,
): Promise<DriverVehicleAssignment[]> => {
  return prisma.driverVehicleAssignment.findMany({
    where: { vehicleId },
    include: {
      driver: { select: { driver_id: true, name: true, status: true } },
      vehicle: {
        select: {
          vehicle_id: true,
          plateNumber: true,
          type: true,
          status: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
};

export const deleteAssignment = async (
  id: number,
): Promise<DriverVehicleAssignment | null> => {
  const assignment = await prisma.driverVehicleAssignment.findUnique({
    where: { assignment_id: id },
    include: { driver: true, vehicle: true },
  });

  if (!assignment) return null;

  return prisma.$transaction(async (tx) => {
    if (assignment.status === AssignmentStatus.ACTIVE) {
      await tx.driver.update({
        where: { driver_id: assignment.driverId },
        data: { status: DriverStatus.AVAILABLE },
      });

      await tx.vehicle.update({
        where: { vehicle_id: assignment.vehicleId },
        data: { status: VehicleStatus.AVAILABLE },
      });
    }

    return tx.driverVehicleAssignment.delete({ where: { assignment_id: id } });
  });
};
