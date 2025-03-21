import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { QueueService } from '../../queue/queue.service';
import { WebsocketGateway } from '../../websocket/websocket.gateway';
import { VehicleStatus, OrderStatus, Vehicle, Order } from '@prisma/client';
import { MatchingRequestDto } from './dto/matching-request.dto';

export interface SuccessfulMatch {
  orderId: string;
  vehicleId: number | null;
}

export interface FailedMatch {
  orderId: string;
  reason: string;
}

export interface BatchMatchingResult {
  successful: SuccessfulMatch[];
  failed: FailedMatch[];
}

@Injectable()
export class MatchingService {
  private readonly logger = new Logger(MatchingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
    private readonly websocketGateway: WebsocketGateway,
  ) {}

  /**
   * Match an order with the most suitable vehicle
   * @param orderId - The ID of the order to match
   */
  async matchOrderWithVehicle(orderId: string): Promise<Order | null> {
    this.logger.log(`Starting matching process for order: ${orderId}`);

    try {
      const orderIdNumber = parseInt(orderId, 10);

      if (isNaN(orderIdNumber)) {
        throw new Error(`Invalid order ID: ${orderId}`);
      }

      // Update order status to MATCHING
      const order = await this.prisma.order.update({
        where: { id: orderIdNumber },
        data: { status: OrderStatus.MATCHING },
      });

      // Find available vehicles
      const suitableVehicles = await this.findSuitableVehicles(order);

      if (suitableVehicles.length === 0) {
        this.logger.warn(
          `No suitable vehicles found for order: ${orderIdNumber}`,
        );
        return null;
      }

      // Find the best matching vehicle
      const bestVehicle = this.findBestVehicleMatch(order, suitableVehicles);

      // Update order with matched vehicle
      const updatedOrder = await this.prisma.order.update({
        where: { id: order.id },
        data: {
          vehicle_matched: bestVehicle.id,
          status: OrderStatus.MATCHED,
        },
        include: {
          vehicle: true,
        },
      });

      // Update vehicle status
      await this.prisma.vehicle.update({
        where: { id: bestVehicle.id },
        data: { status: VehicleStatus.ASSIGNED },
      });

      // Notify via WebSocket
      this.websocketGateway.notifyVehicleMatched(updatedOrder);

      // Send message to queue
      await this.queueService.sendToQueue('order-matched', {
        orderId: order.id,
        vehicleId: bestVehicle.id,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(
        `Order ${orderIdNumber} successfully matched with vehicle ${bestVehicle.id}`,
      );

      return updatedOrder;
    } catch (error) {
      this.logger.error(
        `Error in matching process for order ${orderId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Find suitable vehicles for an order based on capacity constraints
   */
  private async findSuitableVehicles(order: Order): Promise<Vehicle[]> {
    return this.prisma.vehicle.findMany({
      where: {
        status: VehicleStatus.AVAILABLE,
        max_weight_kg: { gte: order.package_weight_kg },
        max_volume_m3: { gte: order.package_volume_m3 },
        length_m: { gte: order.package_length_m },
        width_m: { gte: order.package_width_m },
        height_m: { gte: order.package_height_m },
      },
      orderBy: [{ max_weight_kg: 'asc' }, { max_volume_m3: 'asc' }],
    });
  }

  /**
   * Apply the custom matching algorithm to find the best vehicle
   * Uses weighted scoring based on capacity utilization
   */
  private findBestVehicleMatch(order: Order, vehicles: Vehicle[]): Vehicle {
    // Calculate a "fit score" for each vehicle
    const scoredVehicles = vehicles.map((vehicle) => {
      // Calculate weight utilization (higher is better)
      const weightUtilization = order.package_weight_kg / vehicle.max_weight_kg;

      // Calculate volume utilization (higher is better)
      const volumeUtilization = order.package_volume_m3 / vehicle.max_volume_m3;

      // Calculate dimensional utilization
      const lengthUtilization = order.package_length_m / vehicle.length_m;
      const widthUtilization = order.package_width_m / vehicle.width_m;
      const heightUtilization = order.package_height_m / vehicle.height_m;
      const dimensionUtilization =
        (lengthUtilization + widthUtilization + heightUtilization) / 3;

      // Weighted score formula (can be adjusted based on business priorities)
      const score =
        weightUtilization * 0.4 +
        volumeUtilization * 0.4 +
        dimensionUtilization * 0.2;

      return {
        vehicle,
        score,
      };
    });

    // Sort vehicles by score (highest score first)
    scoredVehicles.sort((a, b) => b.score - a.score);

    // Return the best matching vehicle
    return scoredVehicles[0].vehicle;
  }

  /**
   * Process a batch of orders for matching
   */
  async processBatchMatching(
    dto: MatchingRequestDto,
  ): Promise<BatchMatchingResult> {
    const results: BatchMatchingResult = {
      successful: [],
      failed: [],
    };

    for (const orderId of dto.orderIds) {
      try {
        const matchResult = await this.matchOrderWithVehicle(orderId);
        if (matchResult) {
          results.successful.push({
            orderId,
            vehicleId: matchResult.vehicle_matched ?? null, // Ensure null when no match
          });
        } else {
          results.failed.push({
            orderId,
            reason: 'No suitable vehicle found',
          });
        }
      } catch (error) {
        results.failed.push({
          orderId,
          reason: error.message,
        });
      }
    }

    return results;
  }
}
