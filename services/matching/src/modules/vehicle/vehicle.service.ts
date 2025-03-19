import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehicleStatus, Vehicle, Order } from '@prisma/client';
import { QueueService } from '../../queue/queue.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class VehicleService {
  private readonly logger = new Logger(VehicleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(createVehicleDto: CreateVehicleDto): Promise<Vehicle> {
    this.logger.log(
      `Creating new vehicle: ${JSON.stringify(createVehicleDto)}`,
    );

    const vehicle = await this.prisma.vehicle.create({
      data: createVehicleDto,
    });

    // Emit event
    this.eventEmitter.emit('vehicle.created', vehicle);

    // Publish to queue
    await this.queueService.sendToQueue('vehicle-status-changed', {
      vehicleId: vehicle.id,
      status: vehicle.status,
      action: 'created',
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

    this.logger.log(
      `Updating vehicle ${id}: ${JSON.stringify(updateVehicleDto)}`,
    );

    const updatedVehicle = await this.prisma.vehicle.update({
      where: { id },
      data: updateVehicleDto,
    });

    // Emit event
    this.eventEmitter.emit('vehicle.updated', updatedVehicle);

    // Publish to queue if status was updated
    if (updateVehicleDto.status && updateVehicleDto.status !== vehicle.status) {
      await this.queueService.sendToQueue('vehicle-status-changed', {
        vehicleId: updatedVehicle.id,
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

    // Publish to queue
    await this.queueService.sendToQueue('vehicle-status-changed', {
      vehicleId: updatedVehicle.id,
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

    // Publish to queue
    await this.queueService.sendToQueue('vehicle-status-changed', {
      vehicleId: id,
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

    return this.prisma.order.findMany({
      where: { vehicle_matched: id },
      orderBy: { created_at: 'desc' },
    });
  }

  async getAvailableVehicles(): Promise<Vehicle[]> {
    return this.prisma.vehicle.findMany({
      where: { status: VehicleStatus.AVAILABLE },
      orderBy: [{ max_weight_kg: 'asc' }, { max_volume_m3: 'asc' }],
    });
  }
}
