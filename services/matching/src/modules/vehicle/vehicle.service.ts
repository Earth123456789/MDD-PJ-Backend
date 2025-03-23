// matching/src/modules/vehicle/vehicle.service.ts

import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehicleStatus, Vehicle, Order } from '@prisma/client';
import { QueueService } from '../../queue/queue.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UserDriverValidationService } from '../../user-driver-validation.service';

interface DriverWithDistance {
  id: number;
  user_id: number;
  license_number: string;
  id_card_number: string;
  current_location?: {
    latitude: number;
    longitude: number;
  };
  status: string;
  rating: number;
  created_at: string;
  updated_at: string;
  distance?: number;
  user?: {
    id: number;
    email: string;
    full_name: string;
    phone: string;
    role: string;
  };
}

@Injectable()
export class VehicleService {
  private readonly logger = new Logger(VehicleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
    private readonly eventEmitter: EventEmitter2,
    private readonly userDriverValidation: UserDriverValidationService,
  ) {}

  async create(createVehicleDto: CreateVehicleDto): Promise<Vehicle> {
    this.logger.log(
      `Creating new vehicle: ${JSON.stringify(createVehicleDto)}`,
    );

    const driverExists = await this.userDriverValidation.validateDriver(
      createVehicleDto.driver_id,
    );

    if (!driverExists) {
      this.logger.warn(
        `Driver with ID ${createVehicleDto.driver_id} does not exist in the user-driver service`,
      );
      throw new HttpException(
        `Driver with ID ${createVehicleDto.driver_id} does not exist`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const driverInfo: any = await this.userDriverValidation.getDriverInfo(
      createVehicleDto.driver_id,
    );

    const vehicleData = {
      ...createVehicleDto,
      status: createVehicleDto.status || VehicleStatus.AVAILABLE,
    };

    const vehicle = await this.prisma.vehicle.create({
      data: vehicleData,
    });

    // Emit event
    this.eventEmitter.emit('vehicle.created', vehicle);

    // Publish to queue
    await this.queueService.sendToQueue('vehicle-status-changed', {
      vehicleId: vehicle.id,
      driverId: vehicle.driver_id,
      driverName: driverInfo?.user?.full_name || null,
      status: vehicle.status,
      action: 'created',
      vehicleType: vehicle.vehicle_type,
      capacity: {
        maxWeight: vehicle.max_weight_kg,
        maxVolume: vehicle.max_volume_m3,
        dimensions: {
          length: vehicle.length_m,
          width: vehicle.width_m,
          height: vehicle.height_m,
        },
      },
      timestamp: new Date().toISOString(),
    });

    return vehicle;
  }

  async findAll(filters: {
    type?: any;
    status?: any;
    minWeight?: number;
    minVolume?: number;
  }): Promise<Vehicle[]> {
    const { type, status, minWeight, minVolume } = filters;

    const where: any = {};

    if (type) {
      where.vehicle_type = type;
    }

    if (status) {
      where.status = status;
    }

    if (minWeight) {
      where.max_weight_kg = { gte: Number(minWeight) };
    }

    if (minVolume) {
      where.max_volume_m3 = { gte: Number(minVolume) };
    }

    return this.prisma.vehicle.findMany({
      where,
      orderBy: { id: 'asc' },
    });
  }

  async findOne(id: number): Promise<Vehicle | null> {
    return this.prisma.vehicle.findUnique({
      where: { id },
    });
  }

  async update(
    id: number,
    updateVehicleDto: UpdateVehicleDto,
  ): Promise<Vehicle> {
    // Check if vehicle exists
    const vehicle = await this.findOne(id);

    if (!vehicle) {
      throw new Error('Vehicle not found');
    }

    // If changing driver_id, validate that the new driver exists
    if (
      updateVehicleDto.driver_id !== undefined &&
      updateVehicleDto.driver_id !== vehicle.driver_id
    ) {
      const driverExists = await this.userDriverValidation.validateDriver(
        updateVehicleDto.driver_id,
      );

      if (!driverExists) {
        this.logger.warn(
          `Driver with ID ${updateVehicleDto.driver_id} does not exist in the user-driver service`,
        );
        throw new HttpException(
          `Driver with ID ${updateVehicleDto.driver_id} does not exist`,
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    this.logger.log(
      `Updating vehicle ${id}: ${JSON.stringify(updateVehicleDto)}`,
    );

    // Create update data object, ensuring status is not undefined
    const updateData = { ...updateVehicleDto };
    if (updateData.status === undefined) {
      delete updateData.status; // Remove status if undefined to avoid type error
    }

    const updatedVehicle = await this.prisma.vehicle.update({
      where: { id },
      data: updateData,
    });

    // Emit event
    this.eventEmitter.emit('vehicle.updated', updatedVehicle);

    // Get driver info for messaging
    let driverInfo: any = null;
    if (updatedVehicle.driver_id) {
      driverInfo = await this.userDriverValidation.getDriverInfo(
        updatedVehicle.driver_id,
      );
    }

    // Publish to queue if status was updated
    if (updateVehicleDto.status && updateVehicleDto.status !== vehicle.status) {
      await this.queueService.sendToQueue('vehicle-status-changed', {
        vehicleId: updatedVehicle.id,
        driverId: updatedVehicle.driver_id,
        driverName: driverInfo?.user?.full_name || null,
        status: updatedVehicle.status,
        previousStatus: vehicle.status,
        action: 'updated',
        timestamp: new Date().toISOString(),
      });
    }

    return updatedVehicle;
  }

  async updateStatus(id: number, status: VehicleStatus): Promise<Vehicle> {
    // Check if vehicle exists
    const vehicle = await this.findOne(id);

    if (!vehicle) {
      throw new Error('Vehicle not found');
    }

    // Don't update if status is the same
    if (vehicle.status === status) {
      return vehicle;
    }

    this.logger.log(
      `Updating vehicle ${id} status from ${vehicle.status} to ${status}`,
    );

    const updatedVehicle = await this.prisma.vehicle.update({
      where: { id },
      data: { status },
    });

    // Emit event
    this.eventEmitter.emit('vehicle.status.updated', {
      vehicleId: updatedVehicle.id,
      previousStatus: vehicle.status,
      currentStatus: updatedVehicle.status,
    });

    // Get driver info for messaging
    let driverInfo: any = null;
    if (updatedVehicle.driver_id) {
      driverInfo = await this.userDriverValidation.getDriverInfo(
        updatedVehicle.driver_id,
      );
    }

    // Publish to queue
    await this.queueService.sendToQueue('vehicle-status-changed', {
      vehicleId: updatedVehicle.id,
      driverId: updatedVehicle.driver_id,
      driverName: driverInfo?.user?.full_name || null,
      status: updatedVehicle.status,
      previousStatus: vehicle.status,
      action: 'status_updated',
      timestamp: new Date().toISOString(),
    });

    return updatedVehicle;
  }

  async remove(id: number): Promise<void> {
    // Check if vehicle exists
    const vehicle = await this.findOne(id);

    if (!vehicle) {
      throw new Error('Vehicle not found');
    }

    // Check if vehicle has any ongoing orders
    const activeOrders = await this.prisma.order.count({
      where: {
        vehicle_matched: id,
        status: {
          in: ['MATCHED', 'IN_TRANSIT'],
        },
      },
    });

    if (activeOrders > 0) {
      throw new Error('Cannot delete vehicle with active orders');
    }

    this.logger.log(`Deleting vehicle ${id}`);

    await this.prisma.vehicle.delete({
      where: { id },
    });

    // Emit event
    this.eventEmitter.emit('vehicle.deleted', { vehicleId: id });

    // Get driver info for messaging
    let driverInfo: any = null;
    if (vehicle.driver_id) {
      driverInfo = await this.userDriverValidation.getDriverInfo(
        vehicle.driver_id,
      );
    }

    // Publish to queue
    await this.queueService.sendToQueue('vehicle-status-changed', {
      vehicleId: id,
      driverId: vehicle.driver_id,
      driverName: driverInfo?.user?.full_name || null,
      status: 'DELETED',
      previousStatus: vehicle.status,
      action: 'deleted',
      timestamp: new Date().toISOString(),
    });
  }

  async getVehicleOrders(id: number): Promise<Order[]> {
    // Check if vehicle exists
    const vehicle = await this.findOne(id);

    if (!vehicle) {
      throw new Error('Vehicle not found');
    }

    // Also validate that the driver exists
    if (vehicle.driver_id) {
      const driverExists = await this.userDriverValidation.validateDriver(
        vehicle.driver_id,
      );
      if (!driverExists) {
        this.logger.warn(
          `Vehicle ${id} has a driver (${vehicle.driver_id}) that does not exist in the user-driver service`,
        );
      }
    }

    return this.prisma.order.findMany({
      where: { vehicle_matched: id },
      orderBy: { created_at: 'desc' },
    });
  }

  async getAvailableVehicles(): Promise<Vehicle[]> {
    const availableVehicles = await this.prisma.vehicle.findMany({
      where: { status: VehicleStatus.AVAILABLE },
      orderBy: [{ max_weight_kg: 'asc' }, { max_volume_m3: 'asc' }],
    });

    // Filter out vehicles with non-existent drivers
    const validatedVehicles: Vehicle[] = [];
    for (const vehicle of availableVehicles) {
      if (vehicle.driver_id) {
        const driverExists = await this.userDriverValidation.validateDriver(
          vehicle.driver_id,
        );
        if (driverExists) {
          validatedVehicles.push(vehicle);
        } else {
          this.logger.warn(
            `Vehicle ${vehicle.id} has a driver (${vehicle.driver_id}) that does not exist in the user-driver service`,
          );
        }
      } else {
        // If no driver assigned, still include the vehicle
        validatedVehicles.push(vehicle);
      }
    }

    return validatedVehicles;
  }

  /**
   * Find nearby available vehicles using the user-driver service
   * @param location - The location to find vehicles near
   * @param radius - The radius in kilometers
   */
  async findNearbyVehicles(
    location: { latitude: number; longitude: number },
    radius: number = 5,
  ): Promise<any[]> {
    try {
      // Get available vehicles from our database
      const availableVehicles = await this.getAvailableVehicles();

      if (availableVehicles.length === 0) {
        return [];
      }

      // Get driver IDs from available vehicles
      const driverIds = availableVehicles
        .filter((vehicle) => vehicle.driver_id !== null)
        .map((vehicle) => vehicle.driver_id);

      if (driverIds.length === 0) {
        return [];
      }

      // Find nearby drivers from user-driver service
      const nearbyDrivers = (await this.userDriverValidation.findNearbyDrivers(
        location,
        radius,
      )) as DriverWithDistance[];

      if (nearbyDrivers.length === 0) {
        return [];
      }

      // Filter nearby drivers to only include those associated with our available vehicles
      const nearbyDriverIds = new Set(nearbyDrivers.map((driver) => driver.id));

      // Find vehicles whose drivers are nearby
      const nearbyVehicles = availableVehicles.filter(
        (vehicle) =>
          vehicle.driver_id && nearbyDriverIds.has(vehicle.driver_id),
      );

      // Enrich vehicle data with driver information
      return await Promise.all(
        nearbyVehicles.map(async (vehicle) => {
          const driverInfo: any = await this.userDriverValidation.getDriverInfo(
            vehicle.driver_id,
          );
          const driver = nearbyDrivers.find((d) => d.id === vehicle.driver_id);

          return {
            ...vehicle,
            driver: {
              id: vehicle.driver_id,
              name: driverInfo?.user?.full_name || null,
              distance: driver?.distance || null,
              location: driver?.current_location || null,
            },
          };
        }),
      );
    } catch (error) {
      this.logger.error(`Error finding nearby vehicles: ${error.message}`);
      return [];
    }
  }
}
