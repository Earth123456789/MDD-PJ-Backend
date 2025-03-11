import { PrismaClient, DriverVehicleAssignment, AssignmentStatus, DriverStatus, VehicleStatus } from '@prisma/client';
import logger from '../utils/logger.util';

const prisma = new PrismaClient();

export const getAllAssignments = async (): Promise<any[]> => {
  return prisma.driverVehicleAssignment.findMany({
    include: {
      driver: {
        select: {
          id: true,
          name: true,
          status: true,
        },
      },
      vehicle: {
        select: {
          id: true,
          plateNumber: true,
          type: true,
          status: true,
        },
      },
    },
  });
};

export const getAssignmentById = async (id: string): Promise<any | null> => {
  return prisma.driverVehicleAssignment.findUnique({
    where: { id },
    include: {
      driver: {
        select: {
          id: true,
          name: true,
          status: true,
          currentLatitude: true,
          currentLongitude: true,
        },
      },
      vehicle: {
        select: {
          id: true,
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

export const createAssignment = async (driverId: string, vehicleId: string): Promise<any> => {
  // Check if driver exists
  const driver = await prisma.driver.findUnique({
    where: { id: driverId },
  });

  if (!driver) {
    throw new Error('Driver not found');
  }

  // Check if vehicle exists
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
  });

  if (!vehicle) {
    throw new Error('Vehicle not found');
  }

  // Check if driver is available
  if (driver.status !== DriverStatus.AVAILABLE) {
    throw new Error('Driver is not available');
  }

  // Check if vehicle is available
  if (vehicle.status !== VehicleStatus.AVAILABLE) {
    throw new Error('Vehicle is not available');
  }

  // Check if driver has active assignments
  const activeDriverAssignments = await prisma.driverVehicleAssignment.findFirst({
    where: {
      driverId,
      status: AssignmentStatus.ACTIVE,
    },
  });

  if (activeDriverAssignments) {
    throw new Error('Driver already has an active assignment');
  }

  // Check if vehicle has active assignments
  const activeVehicleAssignments = await prisma.driverVehicleAssignment.findFirst({
    where: {
      vehicleId,
      status: AssignmentStatus.ACTIVE,
    },
  });

  if (activeVehicleAssignments) {
    throw new Error('Vehicle already has an active assignment');
  }

  // Create assignment in a transaction
  return prisma.$transaction(async (tx) => {
    // Update driver status
    await tx.driver.update({
      where: { id: driverId },
      data: { status: DriverStatus.BUSY },
    });

    // Update vehicle status
    await tx.vehicle.update({
      where: { id: vehicleId },
      data: { status: VehicleStatus.IN_USE },
    });

    // Create assignment
    const assignment = await tx.driverVehicleAssignment.create({
      data: {
        driverId,
        vehicleId,
        status: AssignmentStatus.ACTIVE,
      },
      include: {
        driver: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        vehicle: {
          select: {
            id: true,
            plateNumber: true,
            type: true,
            status: true,
          },
        },
      },
    });

    return assignment;
  });
};

export const updateAssignmentStatus = async (id: string, status: AssignmentStatus): Promise<any | null> => {
  // Check if assignment exists
  const assignment = await prisma.driverVehicleAssignment.findUnique({
    where: { id },
    include: {
      driver: true,
      vehicle: true,
    },
  });

  if (!assignment) {
    return null;
  }

  // Validate status is in enum
  if (!Object.values(AssignmentStatus).includes(status)) {
    throw new Error(`Invalid status. Must be one of: ${Object.values(AssignmentStatus).join(', ')}`);
  }

  // Handle completing or cancelling assignment
  if (status === AssignmentStatus.COMPLETED || status === AssignmentStatus.CANCELLED) {
    return prisma.$transaction(async (tx) => {
      // Update driver status
      await tx.driver.update({
        where: { id: assignment.driverId },
        data: { status: DriverStatus.AVAILABLE },
      });

      // Update vehicle status
      await tx.vehicle.update({
        where: { id: assignment.vehicleId },
        data: { status: VehicleStatus.AVAILABLE },
      });

      // Update assignment
      const updatedAssignment = await tx.driverVehicleAssignment.update({
        where: { id },
        data: { status },
        include: {
          driver: {
            select: {
              id: true,
              name: true,
              status: true,
            },
          },
          vehicle: {
            select: {
              id: true,
              plateNumber: true,
              type: true,
              status: true,
            },
          },
        },
      });

      return updatedAssignment;
    });
  } else {
    // For other status changes (e.g., setting back to ACTIVE)
    return prisma.driverVehicleAssignment.update({
      where: { id },
      data: { status },
      include: {
        driver: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        vehicle: {
          select: {
            id: true,
            plateNumber: true,
            type: true,
            status: true,
          },
        },
      },
    });
  }
};

export const getAssignmentsByDriver = async (driverId: string): Promise<any[]> => {
  return prisma.driverVehicleAssignment.findMany({
    where: {
      driverId,
    },
    include: {
      driver: {
        select: {
          id: true,
          name: true,
          status: true,
        },
      },
      vehicle: {
        select: {
          id: true,
          plateNumber: true,
          type: true,
          status: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
};

export const getAssignmentsByVehicle = async (vehicleId: string): Promise<any[]> => {
  return prisma.driverVehicleAssignment.findMany({
    where: {
      vehicleId,
    },
    include: {
      driver: {
        select: {
          id: true,
          name: true,
          status: true,
        },
      },
      vehicle: {
        select: {
          id: true,
          plateNumber: true,
          type: true,
          status: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
};

export const deleteAssignment = async (id: string): Promise<DriverVehicleAssignment | null> => {
  // Check if assignment exists
  const assignment = await prisma.driverVehicleAssignment.findUnique({
    where: { id },
    include: {
      driver: true,
      vehicle: true,
    },
  });

  if (!assignment) {
    return null;
  }

  // Delete assignment in a transaction and reset driver and vehicle status
  return prisma.$transaction(async (tx) => {
    // Reset driver status if needed
    if (assignment.status === AssignmentStatus.ACTIVE) {
      await tx.driver.update({
        where: { id: assignment.driverId },
        data: { status: DriverStatus.AVAILABLE },
      });

      // Reset vehicle status if needed
      await tx.vehicle.update({
        where: { id: assignment.vehicleId },
        data: { status: VehicleStatus.AVAILABLE },
      });
    }

    // Delete assignment
    return tx.driverVehicleAssignment.delete({
      where: { id },
    });
  });
};