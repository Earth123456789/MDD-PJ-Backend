// matching/src/modules/matching/matching.service.ts

import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { QueueService } from 'src/queue/queue.service';
import { WebsocketGateway } from 'src/websocket/websocket.gateway';
import { UserDriverValidationService } from 'src/user-driver-validation.service';
import {
  VehicleStatus,
  OrderStatus,
  Vehicle,
  Order,
  Prisma,
} from '@prisma/client';
import { MatchingRequestDto } from './dto/matching-request.dto';
import { transformOrderForWebSocket } from 'src/utils/transformers';
import { calculateFare, VehicleType } from 'src/utils/calculate-fare';


export interface SuccessfulMatch {
  orderId: string;
  vehicleId: string | null;
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

// Interface for matching score
interface MatchingScore {
  vehicleId: string;
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
  ) { }

  /**
   * Match an order with the most suitable vehicle using Knapsack algorithm
   * @param orderId - The ID of the order to match
   */
  async matchOrderWithVehicle(orderId: string): Promise<Order | null> {
    this.logger.log(`Starting matching process for order: ${orderId}`);

    try {
      // Get the order details
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
      });

      if (!order) {
        throw new Error(`Order not found: ${orderId}`);
      }

      // Check if order is already in a non-PENDING state
      const ineligibleStatuses: Array<'CANCELLED' | 'DELIVERED'> = [
        'CANCELLED',
        'DELIVERED',
      ];
      if (
        ineligibleStatuses.includes(order.status as 'CANCELLED' | 'DELIVERED')
      ) {
        throw new HttpException(
          `Order ${orderId} is not eligible for matching (status: ${order.status})`,
          HttpStatus.BAD_REQUEST,
        );
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
      const previousStatus = order.status;
      const matchedVehicle = await this.prisma.vehicle.findFirst({
        where: {
          status: 'AVAILABLE',
          max_weight_kg: { gte: order.package_weight_kg },
          max_volume_m3: { gte: order.package_volume_m3 },
          length_m: { gte: order.package_length_m },
          width_m: { gte: order.package_width_m },
          height_m: { gte: order.package_height_m },
        },
      });
      this.logger.log(
        `[MATCHING] Order dimensions: weight=${order.package_weight_kg}, volume=${order.package_volume_m3}, length=${order.package_length_m}, width=${order.package_width_m}, height=${order.package_height_m}`,
      );

      if (!matchedVehicle) {
        this.logger.warn(`[MATCHING] No vehicle matched for order ${order.id}`);
      }

      if (!matchedVehicle) {
        this.logger.warn(
          `[MATCHING] No suitable vehicles found for order: ${orderId}`,
        );
        throw new HttpException(
          'No suitable vehicle found for the order',
          HttpStatus.NOT_FOUND,
        );
      }

      const updatedOrder = await this.prisma.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.MATCHING,
          vehicle_id: matchedVehicle.id,
        },
        include: {
          vehicle: true,
        },
      });

      // Notify about order status change via WebSocket and RabbitMQ
      this.websocketGateway.notifyOrderStatusChanged(updatedOrder);

      // ส่งสถานะ MATCHING
      await this.queueService.sendToQueue('order-status-changed', {
        order_id: updatedOrder.id,
        previous_status: previousStatus,
        status: OrderStatus.MATCHING,
        user_id: updatedOrder.user_id,
        timestamp: new Date().toISOString(),
        pickup_location: updatedOrder.pickup_location,
        dropoff_location: updatedOrder.dropoff_location,
      });

      // ส่ง event การจับคู่
      await this.queueService.sendToQueue('order-vehicle-matched', {
        order_id: updatedOrder.id,
        vehicle_id: updatedOrder.vehicle_id,
        user_id: updatedOrder.user_id,
        matched_at: new Date().toISOString(),
      });

      // Find available vehicles
      // ค้นหา vehicles ที่มีสถานะ AVAILABLE
      const availableVehicles = await this.prisma.vehicle.findMany({
        where: {
          // status: 'AVAILABLE',
          max_weight_kg: { gte: order.package_weight_kg },
          max_volume_m3: { gte: order.package_volume_m3 },
        },
      });

      this.logger.log(
        `[MATCHING] Found ${availableVehicles.length} candidate vehicles`,
      );

      availableVehicles.forEach((v) => {
        this.logger.log(
          `[MATCHING] Vehicle ${v.id} volume: ${v.max_volume_m3}`,
        );
      });

      // เช็คถ้าไม่มีรถให้ใช้งานเลย
      if (availableVehicles.length === 0) {
        this.logger.warn(
          `[MATCHING] No available vehicles found for order: ${orderId}`,
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
          `No suitable vehicles found for order: ${orderId}`,
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
          `No vehicles with valid drivers found for order: ${orderId}`,
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
          `No matching vehicle found with Knapsack algorithm for order: ${orderId}`,
        );
        return null;
      }

      // Get the matched vehicle details for price calculation
      const bestVehicle = validatedVehicles.find(v => v.id === bestMatch.vehicleId);
      if (!bestVehicle) {
        this.logger.warn(`Could not find matched vehicle with ID ${bestMatch.vehicleId}`);
        return null;
      }

      // Calculate distance between pickup and dropoff
      const distanceKm = this.calculateDistance(
        order.pickup_location,
        order.dropoff_location
      );

      // Estimate duration based on distance
      // Assuming average speed of 30 km/h
      const durationMin = Math.round(distanceKm * 60 / 30);

      // Calculate the price
      const price = calculateFare({
        vehicleType: bestVehicle.vehicle_type as VehicleType,
        distanceKm,
        durationMin,
        // Default values for other parameters
        surgeMultiplier: 1,
        tollFees: 0,
        otherFees: 0
      });

      this.logger.log(
        `[PRICING] Calculated price for order ${orderId}: ${price} THB (distance: ${distanceKm.toFixed(2)} km, duration: ${durationMin} min)`,
      );

      // Update order with matched vehicle and calculated price
      const previousOrderStatus = updatedOrder.status;
      const matchedOrder = await this.prisma.order.update({
        where: { id: order.id },
        data: {
          vehicle_matched: bestMatch.vehicleId,
          status: OrderStatus.MATCHED,
          price: price, // Update the price
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
      const previousVehicleStatus = VehicleStatus.AVAILABLE;
      await this.updateVehicleStatus(
        bestMatch.vehicleId,
        VehicleStatus.ASSIGNED,
      );

      // Using the included vehicle directly from matchedOrder
      // This fixes the issue with null vs undefined
      this.websocketGateway.notifyOrderStatusChanged(matchedOrder);
      this.websocketGateway.notifyVehicleMatched(
        transformOrderForWebSocket(matchedOrder),
      );

      // Get driver info for messaging
      const vehicle = matchedOrder.vehicle;

      // Using optional chaining with nullish coalescing
      const driverInfo: any = vehicle?.driver_id
        ? await this.userDriverValidation.getDriverInfo(vehicle.driver_id)
        : null;

      // Send order-matched message to queue
      await this.queueService.sendToQueue('order-matched', {
        order_id: order.id,
        vehicle_id: bestMatch.vehicleId,
        driver_id: vehicle?.driver_id || null,
        driver_name: driverInfo?.user?.full_name || null,
        algorithm: 'knapsack',
        score: bestMatch.totalScore,
        timestamp: new Date().toISOString(),
        pickup_location: matchedOrder.pickup_location,
        dropoff_location: matchedOrder.dropoff_location,
        price: matchedOrder.price, // Include the calculated price
      });

      // Send order-status-changed message to queue
      await this.queueService.sendToQueue('order-status-changed', {
        order_id: matchedOrder.id,
        previous_status: previousOrderStatus,
        status: OrderStatus.MATCHED,
        user_id: matchedOrder.user_id,
        vehicle_id: bestMatch.vehicleId,
        driver_id: vehicle?.driver_id || null,
        timestamp: new Date().toISOString(),
        pickup_location: matchedOrder.pickup_location,
        dropoff_location: matchedOrder.dropoff_location,
        price: matchedOrder.price, // Include the calculated price
      });

      // Send vehicle-status-changed message to queue
      await this.queueService.sendToQueue('vehicle-status-changed', {
        vehicle_id: bestMatch.vehicleId,
        driver_id: vehicle?.driver_id || null,
        previous_status: previousVehicleStatus,
        status: VehicleStatus.ASSIGNED,
        order_id: matchedOrder.id,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(
        `Order ${orderId} successfully matched with vehicle ${bestMatch.vehicleId} using Knapsack algorithm (score: ${bestMatch.totalScore.toFixed(2)}, price: ${matchedOrder.price} THB)`,
      );

      return matchedOrder;
    } catch (error) {
      this.logger.error(
        `Error in matching process for order ${orderId}: ${error.message}`,
      );
      throw error;
    }
  }

  async getOrderPriceById(orderId: string): Promise<{ fare: number; order: any } | null> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { vehicle: true },
    });

    if (!order || !order.vehicle) return null;

    const distanceKm = 'distance_km' in order ? (order as any).distance_km ?? 0 : 0;
    const durationMin = 'duration_min' in order ? order.duration_min ?? 0 : 0;

    const fare = calculateFare({
      vehicleType: order.vehicle.vehicle_type as VehicleType,
      distanceKm,
      durationMin: typeof durationMin === 'number' ? durationMin : 0,
      surgeMultiplier: 'surge_multiplier' in order ? (order as any).surge_multiplier ?? 1 : 1,
      tollFees: 'toll_fees' in order ? (order as any).toll_fees ?? 0 : 0,
      otherFees: 'other_fees' in order ? (order as any).other_fees ?? 0 : 0,
    });

    return { fare, order };
  }


  /**
   * Start delivery - transition from MATCHED to IN_TRANSIT
   * @param orderId - The ID of the order to start delivery for
   */
  async startDelivery(orderId: string): Promise<Order | null> {
    try {
      // Validate the order exists and is in MATCHED state
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: { vehicle: true },
      });

      if (!order) {
        this.logger.warn(`Order ${orderId} not found`);
        return null;
      }

      if (order.status !== OrderStatus.MATCHED) {
        this.logger.warn(
          `Order ${orderId} is not in MATCHED state (current: ${order.status})`,
        );
        throw new HttpException(
          `Order ${orderId} is not ready for delivery (status: ${order.status})`,
          HttpStatus.BAD_REQUEST,
        );
      }

      if (!order.vehicle_matched) {
        this.logger.warn(`Order ${orderId} has no matched vehicle`);
        throw new HttpException(
          `Order ${orderId} has no matched vehicle`,
          HttpStatus.BAD_REQUEST,
        );
      }

      // Update order status to IN_TRANSIT
      const previousOrderStatus = order.status;
      const updatedOrder = await this.prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.IN_TRANSIT },
        include: { vehicle: true },
      });

      // Update vehicle status to IN_TRANSIT
      const previousVehicleStatus = VehicleStatus.ASSIGNED;
      await this.prisma.vehicle.update({
        where: { id: order.vehicle_matched },
        data: { status: VehicleStatus.IN_TRANSIT },
      });

      // Notify via WebSocket
      this.websocketGateway.notifyOrderStatusChanged(updatedOrder);

      // Get the vehicle for the message
      const vehicle = order.vehicle;

      // Send order-status-changed message to queue
      await this.queueService.sendToQueue('order-status-changed', {
        order_id: updatedOrder.id,
        previous_status: previousOrderStatus,
        status: OrderStatus.IN_TRANSIT,
        user_id: updatedOrder.user_id,
        vehicle_id: order.vehicle_matched,
        driver_id: vehicle?.driver_id || null,
        timestamp: new Date().toISOString(),
        pickup_location: updatedOrder.pickup_location,
        dropoff_location: updatedOrder.dropoff_location,
        distance_total: this.calculateDistance(
          updatedOrder.pickup_location,
          updatedOrder.dropoff_location,
        ),
        estimated_arrival_time: this.estimateArrivalTime(
          updatedOrder.pickup_location,
          updatedOrder.dropoff_location,
        ),
      });

      // Send vehicle-status-changed message to queue
      await this.queueService.sendToQueue('vehicle-status-changed', {
        vehicle_id: order.vehicle_matched,
        driver_id: vehicle?.driver_id || null,
        previous_status: previousVehicleStatus,
        status: VehicleStatus.IN_TRANSIT,
        order_id: updatedOrder.id,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(
        `Order ${orderId} delivery started (status changed to IN_TRANSIT)`,
      );

      return updatedOrder;
    } catch (error) {
      this.logger.error(
        `Error starting delivery for order ${orderId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Complete delivery - transition from IN_TRANSIT to DELIVERED
   * @param orderId - The ID of the order to complete
   */
  async completeDelivery(orderId: string): Promise<Order | null> {
    try {
      // Validate the order exists and is in IN_TRANSIT state
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: { vehicle: true },
      });

      if (!order) {
        this.logger.warn(`Order ${orderId} not found`);
        return null;
      }

      if (order.status !== OrderStatus.IN_TRANSIT) {
        this.logger.warn(
          `Order ${orderId} is not in IN_TRANSIT state (current: ${order.status})`,
        );
        throw new HttpException(
          `Order ${orderId} is not in delivery (status: ${order.status})`,
          HttpStatus.BAD_REQUEST,
        );
      }

      if (!order.vehicle_matched) {
        this.logger.warn(`Order ${orderId} has no matched vehicle`);
        throw new HttpException(
          `Order ${orderId} has no matched vehicle`,
          HttpStatus.BAD_REQUEST,
        );
      }

      // Update order status to DELIVERED
      const previousOrderStatus = order.status;
      const updatedOrder = await this.prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.DELIVERED },
        include: { vehicle: true },
      });

      // Update vehicle status to AVAILABLE
      const previousVehicleStatus = VehicleStatus.IN_TRANSIT;
      await this.prisma.vehicle.update({
        where: { id: order.vehicle_matched },
        data: { status: VehicleStatus.AVAILABLE },
      });

      // Notify via WebSocket
      this.websocketGateway.notifyOrderStatusChanged(updatedOrder);

      // Get the vehicle for the message
      const vehicle = order.vehicle;

      // Send order-status-changed message to queue
      await this.queueService.sendToQueue('order-status-changed', {
        order_id: updatedOrder.id,
        previous_status: previousOrderStatus,
        status: OrderStatus.DELIVERED,
        user_id: updatedOrder.user_id,
        vehicle_id: order.vehicle_matched,
        driver_id: vehicle?.driver_id || null,
        timestamp: new Date().toISOString(),
      });

      // Send vehicle-status-changed message to queue
      await this.queueService.sendToQueue('vehicle-status-changed', {
        vehicle_id: order.vehicle_matched,
        driver_id: vehicle?.driver_id || null,
        previous_status: previousVehicleStatus,
        status: VehicleStatus.AVAILABLE,
        order_id: updatedOrder.id,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(
        `Order ${orderId} delivery completed (status changed to DELIVERED)`,
      );

      return updatedOrder;
    } catch (error) {
      this.logger.error(
        `Error completing delivery for order ${orderId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Cancel an order (from any state)
   * @param orderId - The ID of the order to cancel
   */
  async cancelOrder(orderId: string): Promise<Order | null> {
    try {
      // Find the order
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: { vehicle: true },
      });

      if (!order) {
        this.logger.warn(`Order ${orderId} not found`);
        return null;
      }

      // Check if the order is already cancelled or delivered
      if (
        order.status === OrderStatus.CANCELLED ||
        order.status === OrderStatus.DELIVERED
      ) {
        this.logger.warn(
          `Order ${orderId} is already in final state: ${order.status}`,
        );
        throw new HttpException(
          `Order ${orderId} cannot be cancelled (status: ${order.status})`,
          HttpStatus.BAD_REQUEST,
        );
      }

      const previousOrderStatus = order.status;
      const vehicleId = order.vehicle_matched;
      let previousVehicleStatus: VehicleStatus | undefined = undefined;
      let vehicle: Vehicle | undefined = undefined;

      // If a vehicle is assigned, get its details and status
      if (vehicleId) {
        vehicle = order.vehicle || undefined;
        if (vehicle) {
          previousVehicleStatus = vehicle.status;
        }
      }

      // Update order status to CANCELLED
      const updatedOrder = await this.prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.CANCELLED },
        include: { vehicle: true },
      });

      // If a vehicle was assigned, update its status to AVAILABLE
      if (vehicleId && previousVehicleStatus) {
        await this.prisma.vehicle.update({
          where: { id: vehicleId },
          data: { status: VehicleStatus.AVAILABLE },
        });
      }

      // Notify via WebSocket
      this.websocketGateway.notifyOrderStatusChanged(updatedOrder);

      // Send order-status-changed message to queue
      await this.queueService.sendToQueue('order-status-changed', {
        order_id: updatedOrder.id,
        previous_status: previousOrderStatus,
        status: OrderStatus.CANCELLED,
        user_id: updatedOrder.user_id,
        vehicle_id: vehicleId,
        driver_id: vehicle?.driver_id || null,
        timestamp: new Date().toISOString(),
      });

      // If a vehicle was assigned, send vehicle-status-changed message
      if (vehicleId && previousVehicleStatus && vehicle) {
        await this.queueService.sendToQueue('vehicle-status-changed', {
          vehicle_id: vehicleId,
          driver_id: vehicle.driver_id || null,
          previous_status: previousVehicleStatus,
          status: VehicleStatus.AVAILABLE,
          order_id: updatedOrder.id,
          timestamp: new Date().toISOString(),
        });
      }

      this.logger.log(`Order ${orderId} cancelled`);

      return updatedOrder;
    } catch (error) {
      this.logger.error(`Error cancelling order ${orderId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Calculate distance between pickup and dropoff points
   * @param pickup - Pickup location coordinates
   * @param dropoff - Dropoff location coordinates
   * @returns Distance in kilometers
   */
  private calculateDistance(pickup: any, dropoff: any): number {
    // Simple Euclidean distance calculation (simplified for example)
    // In a real application, you'd use a more sophisticated algorithm
    // or a mapping service API to calculate actual route distance
    try {
      const R = 6371; // Earth radius in km
      const dLat = this.deg2rad(dropoff.latitude - pickup.latitude);
      const dLon = this.deg2rad(dropoff.longitude - pickup.longitude);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(this.deg2rad(pickup.latitude)) *
        Math.cos(this.deg2rad(dropoff.latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;
      return parseFloat(distance.toFixed(2));
    } catch (error) {
      this.logger.warn(`Error calculating distance: ${error.message}`);
      return 0;
    }
  }

  /**
   * Convert degrees to radians
   */
  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  /**
   * Estimate arrival time based on distance
   * @param pickup - Pickup location coordinates
   * @param dropoff - Dropoff location coordinates
   * @returns Estimated arrival time
   */
  private estimateArrivalTime(pickup: any, dropoff: any): string {
    try {
      const distance = this.calculateDistance(pickup, dropoff);
      // Assuming average speed of 30 km/h
      const timeHours = distance / 30;
      const now = new Date();
      const arrivalTime = new Date(now.getTime() + timeHours * 60 * 60 * 1000);
      return arrivalTime.toISOString();
    } catch (error) {
      this.logger.warn(`Error estimating arrival time: ${error.message}`);
      // Default to 1 hour from now
      const oneHourLater = new Date(Date.now() + 60 * 60 * 1000);
      return oneHourLater.toISOString();
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
    orderId: string,
    matchingScore: MatchingScore,
  ): Promise<void> {
    try {
      await this.prisma.matchingScore.create({
        data: {
          order_id: orderId,
          vehicle_id: matchingScore.vehicleId,
          weight_score: matchingScore.weightScore,
          volume_score: matchingScore.volumeScore,
          dimension_score: matchingScore.dimensionScore,
          total_score: matchingScore.totalScore,
        },
      });

      this.logger.log(
        `Saved matching score for order ${orderId} and vehicle ${matchingScore.vehicleId}`,
      );
    } catch (error) {
      this.logger.error(`Error saving matching score: ${error.message}`);
      // Don't throw, just log the error as this is non-critical
    }
  }

  /**
   * Create matching attempt record
   */
  private async createMatchingAttempt(
    orderId: string,
    vehicleId: string,
    score: number,
  ): Promise<void> {
    try {
      await this.prisma.matchingAttempt.create({
        data: {
          order_id: orderId,
          vehicle_id: vehicleId,
          algorithm_used: 'knapsack',
          score: score,
          status: 'MATCHED',
        },
      });

      this.logger.log(
        `Created matching attempt record for order ${orderId} and vehicle ${vehicleId}`,
      );
    } catch (error) {
      this.logger.error(`Error creating matching attempt: ${error.message}`);
      // Don't throw, just log the error as this is non-critical
    }
  }

  /**
   * Update vehicle status
   */
  private async updateVehicleStatus(
    vehicleId: string,
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
      const orderIds = dto.orderIds;

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
            orderId: order.id,
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
            orderId: order.id,
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
            orderId: order.id,
            reason: 'No vehicles with valid drivers available for matching',
          });
        });
        return results;
      }

      // Update all orders to MATCHING status and send events
      for (const order of orders) {
        const previousStatus = order.status;
        await this.prisma.order.update({
          where: {
            id: order.id,
          },
          data: {
            status: OrderStatus.MATCHING,
          },
        });

        // Notify about order status change via WebSocket and RabbitMQ
        this.websocketGateway.notifyOrderStatusChanged({
          ...order,
          status: OrderStatus.MATCHING,
        });

        await this.queueService.sendToQueue('order-status-changed', {
          order_id: order.id,
          previous_status: previousStatus,
          status: OrderStatus.MATCHING,
          user_id: order.user_id,
          timestamp: new Date().toISOString(),
          pickup_location: order.pickup_location,
          dropoff_location: order.dropoff_location,
        });
      }

      // Solve the multi-knapsack problem
      const assignments = this.solveMultiKnapsack(orders, validatedVehicles);

      // Process the assignments
      const assignedVehicleIds = new Set<string>();

      for (const order of orders) {
        const assignment = assignments.get(order.id);

        if (assignment) {
          const { vehicleId, score } = assignment;
          assignedVehicleIds.add(vehicleId);

          // Get vehicle details for price calculation
          const vehicle = await this.prisma.vehicle.findUnique({
            where: { id: vehicleId }
          });

          if (!vehicle) {
            this.logger.warn(`Cannot find vehicle with ID ${vehicleId} for price calculation`);
            results.failed.push({
              orderId: order.id,
              reason: 'Vehicle not found for price calculation',
            });
            continue;
          }

          // Calculate distance and duration
          const distanceKm = this.calculateDistance(
            order.pickup_location,
            order.dropoff_location
          );
          const durationMin = Math.round(distanceKm * 60 / 30); // Assuming 30 km/h average speed

          // Calculate the price
          const price = calculateFare({
            vehicleType: vehicle.vehicle_type as VehicleType,
            distanceKm,
            durationMin,
            surgeMultiplier: 1,
            tollFees: 0,
            otherFees: 0
          });

          this.logger.log(
            `[PRICING] Batch matching: Calculated price for order ${order.id}: ${price} THB (distance: ${distanceKm.toFixed(2)} km, duration: ${durationMin} min)`,
          );

          // Update order with matched vehicle
          const previousStatus = OrderStatus.MATCHING;
          const updatedOrder = await this.prisma.order.update({
            where: { id: order.id },
            data: {
              vehicle_matched: vehicleId,
              status: OrderStatus.MATCHED,
              price: price, // Update with calculated price
            },
            include: { vehicle: true },
          });

          // Create matching attempt record
          await this.createMatchingAttempt(order.id, vehicleId, score);

          // Save matching score for analytics
          await this.saveMatchingScore(order.id, {
            vehicleId,
            weightScore: score * 0.35, // Simplified for batch processing
            volumeScore: score * 0.35,
            dimensionScore: score * 0.3,
            totalScore: score,
          });

          // Get vehicle information directly from the updated order
          const matchedVehicle = updatedOrder.vehicle;

          // Get driver info if vehicle exists and has a driver
          const driverInfo: any = vehicle?.driver_id
            ? await this.userDriverValidation.getDriverInfo(vehicle.driver_id)
            : null;

          // Add to successful matches
          results.successful.push({
            orderId: order.id,
            vehicleId,
            score,
            algorithm: 'multi-knapsack',
          });

          // Notify via WebSocket
          this.websocketGateway.notifyOrderStatusChanged(updatedOrder);
          this.websocketGateway.notifyVehicleMatched(
            transformOrderForWebSocket(updatedOrder),
          );

          // Send order-matched message to queue
          await this.queueService.sendToQueue('order-matched', {
            order_id: order.id,
            vehicle_id: vehicleId,
            driver_id: vehicle?.driver_id || null,
            driver_name: driverInfo?.user?.full_name || null,
            algorithm: 'multi-knapsack',
            score,
            timestamp: new Date().toISOString(),
            pickup_location: order.pickup_location,
            dropoff_location: order.dropoff_location,
          });

          // Send order-status-changed message to queue
          await this.queueService.sendToQueue('order-status-changed', {
            order_id: order.id,
            previous_status: previousStatus,
            status: OrderStatus.MATCHED,
            user_id: order.user_id,
            vehicle_id: vehicleId,
            driver_id: vehicle?.driver_id || null,
            timestamp: new Date().toISOString(),
            pickup_location: order.pickup_location,
            dropoff_location: order.dropoff_location,
          });
        } else {
          // No matching vehicle found
          await this.prisma.order.update({
            where: { id: order.id },
            data: { status: OrderStatus.PENDING },
          });

          results.failed.push({
            orderId: order.id,
            reason: 'No suitable vehicle found using multi-knapsack algorithm',
          });
        }
      }

      // Update statuses of matched vehicles and send events
      for (const vehicleId of assignedVehicleIds) {
        const vehicle = await this.prisma.vehicle.update({
          where: { id: vehicleId },
          data: { status: VehicleStatus.ASSIGNED },
        });

        // Send vehicle-status-changed message to queue
        await this.queueService.sendToQueue('vehicle-status-changed', {
          vehicle_id: vehicleId,
          driver_id: vehicle?.driver_id || null,
          previous_status: VehicleStatus.AVAILABLE,
          status: VehicleStatus.ASSIGNED,
          timestamp: new Date().toISOString(),
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
  ): Map<string, { vehicleId: string; score: number }> {
    // Map to store the result: orderId -> { vehicleId, score }
    const assignments = new Map<string, { vehicleId: string; score: number }>();

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

  /**
   * Get an order by ID
   * @param orderId - The ID of the order to retrieve
   */
  async getOrderById(orderId: string): Promise<Order | null> {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: { vehicle: true },
      });

      return order;
    } catch (error) {
      this.logger.error(`Error getting order ${orderId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all orders with optional filters
   * @param status - Optional status filter
   * @param vehicleId - Optional vehicle ID filter
   * @param userId - Optional user ID filter
   */
  async getAllOrders(
    status?: OrderStatus,
    vehicleId?: string,
    userId?: string,
  ): Promise<Order[]> {
    try {
      const where: Prisma.OrderWhereInput = {};

      if (status) {
        where.status = status;
      }

      if (vehicleId) {
        where.vehicle_matched = vehicleId;
      }

      if (userId) {
        where.user_id = userId;
      }

      const orders = await this.prisma.order.findMany({
        where,
        include: { vehicle: true },
        orderBy: { created_at: 'desc' },
      });

      return orders;
    } catch (error) {
      this.logger.error(`Error getting orders: ${error.message}`);
      throw error;
    }
  }
}