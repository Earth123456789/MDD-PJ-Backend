// matching/src/modules/matching/matching.service.ts

import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { QueueService } from '../../queue/queue.service';
import { WebsocketGateway } from '../../websocket/websocket.gateway';
import { UserDriverValidationService } from '../../user-driver-validation.service';
import {
  VehicleStatus,
  OrderStatus,
  Vehicle,
  Order,
  Prisma,
} from '@prisma/client';
import { MatchingRequestDto } from './dto/matching-request.dto';

export interface SuccessfulMatch {
  orderId: string;
  vehicleId: number | null;
  score: number;
  algorithm: string;
}

export interface FailedMatch {
  orderId: string;
  reason: string;
}

export interface BatchMatchingResult {
  successful: SuccessfulMatch[];
  failed: FailedMatch[];
}

// Interface for the Knapsack problem item
interface KnapsackItem {
  id: number;
  weight: number;
  volume: number;
  length: number;
  width: number;
  height: number;
  value: number; // Priority or value of the order
}

// Interface for vehicle capacity
interface VehicleCapacity {
  id: number;
  maxWeight: number;
  maxVolume: number;
  maxLength: number;
  maxWidth: number;
  maxHeight: number;
}

// Interface for matching score
interface MatchingScore {
  vehicleId: number;
  weightScore: number;
  volumeScore: number;
  dimensionScore: number;
  totalScore: number;
}

@Injectable()
export class MatchingService {
  private readonly logger = new Logger(MatchingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
    private readonly websocketGateway: WebsocketGateway,
    private readonly userDriverValidation: UserDriverValidationService,
  ) {}

  /**
   * Match an order with the most suitable vehicle using Knapsack algorithm
   * @param orderId - The ID of the order to match
   */
  async matchOrderWithVehicle(orderId: string): Promise<Order | null> {
    this.logger.log(`Starting matching process for order: ${orderId}`);

    try {
      const orderIdNumber = parseInt(orderId, 10);

      if (isNaN(orderIdNumber)) {
        throw new Error(`Invalid order ID: ${orderId}`);
      }

      // Get the order details
      const order = await this.prisma.order.findUnique({
        where: { id: orderIdNumber },
      });

      if (!order) {
        throw new Error(`Order not found: ${orderId}`);
      }

      // Validate that the user exists in the user-driver service
      const userExists = await this.userDriverValidation.validateUser(
        order.user_id,
      );
      if (!userExists) {
        this.logger.warn(
          `User with ID ${order.user_id} does not exist in the user-driver service`,
        );
        throw new HttpException(
          `User with ID ${order.user_id} does not exist`,
          HttpStatus.BAD_REQUEST,
        );
      }

      // Update order status to MATCHING
      const updatedOrder = await this.prisma.order.update({
        where: { id: orderIdNumber },
        data: { status: OrderStatus.MATCHING },
      });

      // Find available vehicles
      const availableVehicles = await this.prisma.vehicle.findMany({
        where: { status: VehicleStatus.AVAILABLE },
      });

      if (availableVehicles.length === 0) {
        this.logger.warn(
          `No available vehicles found for order: ${orderIdNumber}`,
        );
        return null;
      }

      // Filter suitable vehicles based on capacity constraints
      const suitableVehicles = this.filterSuitableVehicles(
        updatedOrder,
        availableVehicles,
      );

      if (suitableVehicles.length === 0) {
        this.logger.warn(
          `No suitable vehicles found for order: ${orderIdNumber}`,
        );
        return null;
      }

      // For each vehicle, validate that the driver exists in the user-driver service
      let validatedVehicles: Vehicle[] = [];

      for (const vehicle of suitableVehicles) {
        if (vehicle.driver_id) {
          const driverExists = await this.userDriverValidation.validateDriver(
            vehicle.driver_id,
          );
          if (driverExists) {
            validatedVehicles = [...validatedVehicles, vehicle];
          } else {
            this.logger.warn(
              `Driver with ID ${vehicle.driver_id} does not exist in the user-driver service`,
            );
          }
        }
      }

      if (validatedVehicles.length === 0) {
        this.logger.warn(
          `No vehicles with valid drivers found for order: ${orderIdNumber}`,
        );
        return null;
      }

      // Apply Knapsack algorithm to find the best vehicle match
      const bestMatch = this.findBestVehicleWithKnapsack(
        updatedOrder,
        validatedVehicles,
      );

      if (!bestMatch) {
        this.logger.warn(
          `No matching vehicle found with Knapsack algorithm for order: ${orderIdNumber}`,
        );
        return null;
      }

      // Update order with matched vehicle
      const matchedOrder = await this.prisma.order.update({
        where: { id: order.id },
        data: {
          vehicle_matched: bestMatch.vehicleId,
          status: OrderStatus.MATCHED,
        },
        include: {
          vehicle: true,
        },
      });

      // Save matching score for analytics
      await this.saveMatchingScore(order.id, bestMatch);

      // Create matching attempt record
      await this.createMatchingAttempt(
        order.id,
        bestMatch.vehicleId,
        bestMatch.totalScore,
      );

      // Update vehicle status
      await this.updateVehicleStatus(
        bestMatch.vehicleId,
        VehicleStatus.ASSIGNED,
      );

      // Notify via WebSocket
      this.websocketGateway.notifyVehicleMatched(matchedOrder);

      // Get driver info for messaging
      const vehicle = await this.prisma.vehicle.findUnique({
        where: { id: bestMatch.vehicleId },
      });

      const driverInfo: any = vehicle?.driver_id
        ? await this.userDriverValidation.getDriverInfo(vehicle.driver_id)
        : null;

      // Send message to queue
      await this.queueService.sendToQueue('order-matched', {
        orderId: order.id,
        vehicleId: bestMatch.vehicleId,
        driverId: vehicle?.driver_id || null,
        driverName: driverInfo?.user?.full_name || null,
        algorithm: 'knapsack',
        score: bestMatch.totalScore,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(
        `Order ${orderIdNumber} successfully matched with vehicle ${bestMatch.vehicleId} using Knapsack algorithm (score: ${bestMatch.totalScore.toFixed(2)})`,
      );

      return matchedOrder;
    } catch (error) {
      this.logger.error(
        `Error in matching process for order ${orderId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Filter vehicles that meet the basic capacity requirements for an order
   */
  private filterSuitableVehicles(order: Order, vehicles: Vehicle[]): Vehicle[] {
    return vehicles.filter(
      (vehicle) =>
        vehicle.max_weight_kg >= order.package_weight_kg &&
        vehicle.max_volume_m3 >= order.package_volume_m3 &&
        vehicle.length_m >= order.package_length_m &&
        vehicle.width_m >= order.package_width_m &&
        vehicle.height_m >= order.package_height_m,
    );
  }

  /**
   * Find the best vehicle match using a modified Knapsack algorithm
   * This considers multiple constraints: weight, volume, and dimensions
   */
  private findBestVehicleWithKnapsack(
    order: Order,
    vehicles: Vehicle[],
  ): MatchingScore | null {
    if (vehicles.length === 0) return null;

    // Calculate scores for each vehicle
    const scoredVehicles = vehicles.map((vehicle) => {
      // Weight utilization score (higher is better, but not over capacity)
      const weightUtilization = order.package_weight_kg / vehicle.max_weight_kg;
      const weightScore = weightUtilization <= 1 ? weightUtilization : 0;

      // Volume utilization score
      const volumeUtilization = order.package_volume_m3 / vehicle.max_volume_m3;
      const volumeScore = volumeUtilization <= 1 ? volumeUtilization : 0;

      // Dimension utilization (calculate for each dimension)
      const lengthUtilization = order.package_length_m / vehicle.length_m;
      const widthUtilization = order.package_width_m / vehicle.width_m;
      const heightUtilization = order.package_height_m / vehicle.height_m;

      // Combined dimension score
      const dimensionScore =
        ((lengthUtilization <= 1 ? lengthUtilization : 0) +
          (widthUtilization <= 1 ? widthUtilization : 0) +
          (heightUtilization <= 1 ? heightUtilization : 0)) /
        3;

      // Calculate waste space factor (penalize excessive unused capacity)
      const wasteSpaceFactor =
        1 -
        Math.pow(
          (1 - weightUtilization) *
            (1 - volumeUtilization) *
            (1 - dimensionScore),
          1 / 3,
        );

      // Final score using a weighted combination
      const totalScore =
        weightScore * 0.35 +
        volumeScore * 0.35 +
        dimensionScore * 0.2 +
        wasteSpaceFactor * 0.1;

      return {
        vehicleId: vehicle.id,
        weightScore,
        volumeScore,
        dimensionScore,
        totalScore,
      };
    });

    // Filter out invalid matches (where any score component is 0)
    const validMatches = scoredVehicles.filter(
      (match) =>
        match.weightScore > 0 &&
        match.volumeScore > 0 &&
        match.dimensionScore > 0,
    );

    if (validMatches.length === 0) {
      return null;
    }

    // Sort by total score (highest first)
    validMatches.sort((a, b) => b.totalScore - a.totalScore);

    // Return the best match
    return validMatches[0];
  }

  /**
   * Save matching score for analytics
   */
  private async saveMatchingScore(
    orderId: number,
    matchingScore: MatchingScore,
  ): Promise<void> {
    try {
      // Mock implementation - in a real system, you would save this to a database
      this.logger.log(
        `[MOCK] Saving matching score for order ${orderId} and vehicle ${matchingScore.vehicleId}`,
      );
      this.logger.log(
        `[MOCK] Score details: weight=${matchingScore.weightScore}, volume=${matchingScore.volumeScore}, dimension=${matchingScore.dimensionScore}, total=${matchingScore.totalScore}`,
      );

      // In a real implementation, you would use prisma to save the data
      // await this.prisma.matchingScore.create({...})
    } catch (error) {
      this.logger.error(`Error saving matching score: ${error.message}`);
      // Don't throw, just log the error as this is non-critical
    }
  }

  /**
   * Create matching attempt record
   */
  private async createMatchingAttempt(
    orderId: number,
    vehicleId: number,
    score: number,
  ): Promise<void> {
    try {
      // Mock implementation - in a real system, you would save this to a database
      this.logger.log(
        `[MOCK] Creating matching attempt record for order ${orderId} and vehicle ${vehicleId}`,
      );
      this.logger.log(
        `[MOCK] Attempt details: algorithm=knapsack, score=${score}, status=MATCHED`,
      );

      // In a real implementation, you would use prisma to save the data
      // await this.prisma.matchingAttempt.create({...})
    } catch (error) {
      this.logger.error(`Error creating matching attempt: ${error.message}`);
      // Don't throw, just log the error as this is non-critical
    }
  }

  /**
   * Update vehicle status
   */
  private async updateVehicleStatus(
    vehicleId: number,
    status: VehicleStatus,
  ): Promise<void> {
    try {
      await this.prisma.vehicle.update({
        where: { id: vehicleId },
        data: { status },
      });
    } catch (error) {
      this.logger.error(`Error updating vehicle status: ${error.message}`);
      throw error; // Rethrow as this is critical
    }
  }

  /**
   * Process a batch of orders for matching using Multi-Knapsack algorithm
   */
  async processBatchMatching(
    dto: MatchingRequestDto,
  ): Promise<BatchMatchingResult> {
    this.logger.log(
      `Starting batch matching process for ${dto.orderIds.length} orders`,
    );
    const results: BatchMatchingResult = {
      successful: [],
      failed: [],
    };

    try {
      // Get all orders
      const orderIds = dto.orderIds.map((id) => {
        const parsedId = parseInt(id, 10);
        if (isNaN(parsedId)) {
          throw new Error(`Invalid order ID: ${id}`);
        }
        return parsedId;
      });

      const orders = await this.prisma.order.findMany({
        where: {
          id: {
            in: orderIds,
          },
        },
      });

      if (orders.length === 0) {
        this.logger.warn('No valid orders found for batch matching');
        dto.orderIds.forEach((orderId) => {
          results.failed.push({
            orderId,
            reason: 'Order not found or invalid ID',
          });
        });
        return results;
      }

      // Validate users for all orders exist in the user-driver service
      for (const order of orders) {
        const userExists = await this.userDriverValidation.validateUser(
          order.user_id,
        );
        if (!userExists) {
          this.logger.warn(
            `User with ID ${order.user_id} does not exist in the user-driver service`,
          );
          results.failed.push({
            orderId: order.id.toString(),
            reason: `User with ID ${order.user_id} does not exist`,
          });
          // Remove order from the list to process
          const orderIndex = orders.findIndex((o) => o.id === order.id);
          if (orderIndex !== -1) {
            orders.splice(orderIndex, 1);
          }
        }
      }

      if (orders.length === 0) {
        return results;
      }

      // Get all available vehicles
      const availableVehicles = await this.prisma.vehicle.findMany({
        where: { status: VehicleStatus.AVAILABLE },
      });

      if (availableVehicles.length === 0) {
        // If no vehicles available, mark all orders as failed
        orders.forEach((order) => {
          results.failed.push({
            orderId: order.id.toString(),
            reason: 'No vehicles available for matching',
          });
        });
        return results;
      }

      // Validate drivers for all vehicles exist in the user-driver service
      let validatedVehicles: Vehicle[] = [];

      for (const vehicle of availableVehicles) {
        if (vehicle.driver_id) {
          const driverExists = await this.userDriverValidation.validateDriver(
            vehicle.driver_id,
          );
          if (driverExists) {
            validatedVehicles = [...validatedVehicles, vehicle];
          } else {
            this.logger.warn(
              `Driver with ID ${vehicle.driver_id} does not exist in the user-driver service`,
            );
          }
        }
      }

      if (validatedVehicles.length === 0) {
        // If no vehicles with valid drivers, mark all orders as failed
        orders.forEach((order) => {
          results.failed.push({
            orderId: order.id.toString(),
            reason: 'No vehicles with valid drivers available for matching',
          });
        });
        return results;
      }

      // Update all orders to MATCHING status
      await this.prisma.order.updateMany({
        where: {
          id: {
            in: orders.map((order) => order.id),
          },
        },
        data: {
          status: OrderStatus.MATCHING,
        },
      });

      // Solve the multi-knapsack problem
      const assignments = this.solveMultiKnapsack(orders, validatedVehicles);

      // Process the assignments
      const assignedVehicleIds = new Set<number>();

      for (const order of orders) {
        const assignment = assignments.get(order.id);

        if (assignment) {
          const { vehicleId, score } = assignment;
          assignedVehicleIds.add(vehicleId);

          // Update order with matched vehicle
          await this.prisma.order.update({
            where: { id: order.id },
            data: {
              vehicle_matched: vehicleId,
              status: OrderStatus.MATCHED,
            },
          });

          // Create matching attempt record
          await this.createMatchingAttempt(order.id, vehicleId, score);

          // Get driver info for messaging
          const vehicle = await this.prisma.vehicle.findUnique({
            where: { id: vehicleId },
          });

          const driverInfo: any = vehicle?.driver_id
            ? await this.userDriverValidation.getDriverInfo(vehicle.driver_id)
            : null;

          // Add to successful matches
          results.successful.push({
            orderId: order.id.toString(),
            vehicleId,
            score,
            algorithm: 'multi-knapsack',
          });

          // Send to queue
          await this.queueService.sendToQueue('order-matched', {
            orderId: order.id,
            vehicleId,
            driverId: vehicle?.driver_id || null,
            driverName: driverInfo?.user?.full_name || null,
            algorithm: 'multi-knapsack',
            score,
            timestamp: new Date().toISOString(),
          });
        } else {
          // No matching vehicle found
          await this.prisma.order.update({
            where: { id: order.id },
            data: { status: OrderStatus.PENDING },
          });

          results.failed.push({
            orderId: order.id.toString(),
            reason: 'No suitable vehicle found using multi-knapsack algorithm',
          });
        }
      }

      // Update statuses of matched vehicles
      if (assignedVehicleIds.size > 0) {
        await this.prisma.vehicle.updateMany({
          where: { id: { in: Array.from(assignedVehicleIds) } },
          data: { status: VehicleStatus.ASSIGNED },
        });
      }

      return results;
    } catch (error) {
      this.logger.error(`Error in batch matching process: ${error.message}`);
      throw error;
    }
  }

  /**
   * Multi-dimensional Knapsack solver for matching multiple orders to multiple vehicles
   * This is a more complex version for batch processing
   */
  private solveMultiKnapsack(
    orders: Order[],
    vehicles: Vehicle[],
  ): Map<number, { vehicleId: number; score: number }> {
    // Map to store the result: orderId -> { vehicleId, score }
    const assignments = new Map<number, { vehicleId: number; score: number }>();

    // Convert orders to KnapsackItems
    const knapsackOrders = orders.map((order) => ({
      id: order.id,
      weight: order.package_weight_kg,
      volume: order.package_volume_m3,
      length: order.package_length_m,
      width: order.package_width_m,
      height: order.package_height_m,
      value: 1, // Each order has equal priority in this implementation
    }));

    // Sort orders by value/weight ratio (descending)
    const sortedOrders = [...knapsackOrders].sort(
      (a, b) => b.value / b.weight - a.value / a.weight,
    );

    // Track remaining capacity of each vehicle
    const remainingCapacity = vehicles.map((v) => ({
      id: v.id,
      weight: v.max_weight_kg,
      volume: v.max_volume_m3,
      length: v.length_m,
      width: v.width_m,
      height: v.height_m,
    }));

    // Try to assign each order to the best fitting vehicle
    for (const order of sortedOrders) {
      let bestVehicleIndex = -1;
      let bestFitScore = -Infinity;

      // Find the best vehicle for this order
      for (let i = 0; i < remainingCapacity.length; i++) {
        const vehicle = remainingCapacity[i];

        // Check if the vehicle has enough capacity
        if (
          vehicle.weight >= order.weight &&
          vehicle.volume >= order.volume &&
          vehicle.length >= order.length &&
          vehicle.width >= order.width &&
          vehicle.height >= order.height
        ) {
          // Calculate fit score (higher is better)
          const weightUtilization = order.weight / vehicle.weight;
          const volumeUtilization = order.volume / vehicle.volume;
          const dimensionUtilization =
            (order.length / vehicle.length +
              order.width / vehicle.width +
              order.height / vehicle.height) /
            3;

          const fitScore =
            weightUtilization * 0.4 +
            volumeUtilization * 0.4 +
            dimensionUtilization * 0.2;

          if (fitScore > bestFitScore) {
            bestFitScore = fitScore;
            bestVehicleIndex = i;
          }
        }
      }

      // If a suitable vehicle was found, assign the order and update remaining capacity
      if (bestVehicleIndex !== -1) {
        const vehicle = remainingCapacity[bestVehicleIndex];
        assignments.set(order.id, {
          vehicleId: vehicle.id,
          score: bestFitScore,
        });

        // Update remaining capacity
        vehicle.weight -= order.weight;
        vehicle.volume -= order.volume;
        // Note: In a real implementation, dimensions wouldn't subtract linearly
        // This is a simplified approach for demonstration
      }
    }

    return assignments;
  }

  // Rest of the service methods remain the same...
}
