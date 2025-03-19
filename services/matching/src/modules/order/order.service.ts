import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrderStatus, Order, Prisma } from '@prisma/client';
import { QueueService } from '../../queue/queue.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WebsocketGateway } from '../../websocket/websocket.gateway';

// Define type for order with vehicle included
type OrderWithVehicle = Order & {
  vehicle?: {
    id: number;
    vehicle_type: string;
    driver_id: number;
  } | null;
};

// Type for status history items
interface StatusHistoryItem {
  status: string; // Changed from OrderStatus to string to avoid type issues
  timestamp: string;
  description: string;
}

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
    private readonly eventEmitter: EventEmitter2,
    private readonly websocketGateway: WebsocketGateway,
  ) {}

  async create(createOrderDto: CreateOrderDto): Promise<OrderWithVehicle> {
    this.logger.log(`Creating new order: ${JSON.stringify(createOrderDto)}`);

    // Convert DTO to Prisma-compatible format
    const orderData: Prisma.OrderCreateInput = {
      // Map scalar fields directly
      user_id: createOrderDto.user_id,
      package_weight_kg: createOrderDto.package_weight_kg,
      package_volume_m3: createOrderDto.package_volume_m3,
      package_length_m: createOrderDto.package_length_m,
      package_width_m: createOrderDto.package_width_m,
      package_height_m: createOrderDto.package_height_m,
      status: createOrderDto.status || OrderStatus.PENDING,

      // Convert LocationDto objects to JSON
      pickup_location:
        createOrderDto.pickup_location as unknown as Prisma.InputJsonValue,
      dropoff_location:
        createOrderDto.dropoff_location as unknown as Prisma.InputJsonValue,
    };

    // Create the order in the database
    const order = await this.prisma.order.create({
      data: orderData,
      include: {
        vehicle: true,
      },
    });

    // Emit event
    this.eventEmitter.emit('order.created', order);

    // Send to queue for further processing
    await this.queueService.sendToQueue('order-created', {
      orderId: order.id,
      userId: order.user_id,
      status: order.status,
      timestamp: new Date().toISOString(),
    });

    return order;
  }

  async findAll(filters: {
    status?: any;
    userId?: number;
    vehicleId?: number;
  }): Promise<OrderWithVehicle[]> {
    const { status, userId, vehicleId } = filters;

    const where: Prisma.OrderWhereInput = {};

    if (status) {
      where.status = status;
    }

    if (userId) {
      where.user_id = Number(userId);
    }

    if (vehicleId) {
      where.vehicle_matched = Number(vehicleId);
    }

    return this.prisma.order.findMany({
      where,
      orderBy: { created_at: 'desc' },
      include: {
        vehicle: true,
      },
    });
  }

  async findOne(id: string): Promise<OrderWithVehicle | null> {
    return this.prisma.order.findUnique({
      where: { id: Number(id) },
      include: {
        vehicle: true,
      },
    });
  }

  async update(
    id: string,
    updateOrderDto: UpdateOrderDto,
  ): Promise<OrderWithVehicle> {
    // Check if order exists
    const order = await this.findOne(id);

    if (!order) {
      throw new Error('Order not found');
    }

    // Don't allow updates for orders in certain states
    if (['DELIVERED', 'CANCELLED'].includes(order.status)) {
      throw new Error(`Order in ${order.status} state cannot be updated`);
    }

    this.logger.log(`Updating order ${id}: ${JSON.stringify(updateOrderDto)}`);

    // Create a proper update input for Prisma that handles relationships correctly
    const updateData: Prisma.OrderUpdateInput = {
      user_id: updateOrderDto.user_id,
      pickup_location: updateOrderDto.pickup_location as any,
      dropoff_location: updateOrderDto.dropoff_location as any,
      package_weight_kg: updateOrderDto.package_weight_kg,
      package_volume_m3: updateOrderDto.package_volume_m3,
      package_length_m: updateOrderDto.package_length_m,
      package_width_m: updateOrderDto.package_width_m,
      package_height_m: updateOrderDto.package_height_m,
      status: updateOrderDto.status,
    };

    // Handle vehicle relationship properly
    if (updateOrderDto.vehicle_matched !== undefined) {
      if (updateOrderDto.vehicle_matched === null) {
        updateData.vehicle = { disconnect: true };
      } else {
        updateData.vehicle = {
          connect: { id: updateOrderDto.vehicle_matched },
        };
      }
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id: Number(id) },
      data: updateData,
      include: {
        vehicle: true,
      },
    });

    // Emit event
    this.eventEmitter.emit('order.updated', updatedOrder);

    // Notify via WebSocket if status was updated
    if (updateOrderDto.status && updateOrderDto.status !== order.status) {
      this.websocketGateway.notifyOrderStatusChanged(updatedOrder);

      // Send to queue
      await this.queueService.sendToQueue('order-status-changed', {
        orderId: updatedOrder.id,
        status: updatedOrder.status,
        previousStatus: order.status,
        timestamp: new Date().toISOString(),
      });
    }

    return updatedOrder;
  }

  async updateStatus(
    id: string,
    status: OrderStatus,
  ): Promise<OrderWithVehicle> {
    // Check if order exists
    const order = await this.findOne(id);

    if (!order) {
      throw new Error('Order not found');
    }

    // Don't update if status is the same
    if (order.status === status) {
      return order;
    }

    // Validate status transitions
    this.validateStatusTransition(order.status, status);

    this.logger.log(
      `Updating order ${id} status from ${order.status} to ${status}`,
    );

    // Update only the status field
    const updatedOrder = await this.prisma.order.update({
      where: { id: Number(id) },
      data: { status },
      include: {
        vehicle: true,
      },
    });

    // Emit event
    this.eventEmitter.emit('order.status.updated', {
      orderId: updatedOrder.id,
      previousStatus: order.status,
      currentStatus: updatedOrder.status,
    });

    // Notify via WebSocket
    this.websocketGateway.notifyOrderStatusChanged(updatedOrder);

    // Send to queue
    await this.queueService.sendToQueue('order-status-changed', {
      orderId: updatedOrder.id,
      status: updatedOrder.status,
      previousStatus: order.status,
      timestamp: new Date().toISOString(),
    });

    return updatedOrder;
  }

  async cancel(id: number): Promise<void> {
    // Check if order exists
    const order = await this.findOne(id.toString()); // Convert number to string for findOne()

    if (!order) {
      throw new Error('Order not found');
    }

    // Only allow cancellation for certain states
    if (!['PENDING', 'MATCHING', 'MATCHED'].includes(order.status)) {
      throw new Error(`Order in ${order.status} state cannot be cancelled`);
    }

    this.logger.log(`Cancelling order ${id}`);

    // Update order status to CANCELLED
    const updatedOrder = await this.prisma.order.update({
      where: { id },
      data: { status: OrderStatus.CANCELLED },
      include: {
        vehicle: true,
      },
    });

    // If vehicle was matched, update its status back to AVAILABLE
    if (order.vehicle_matched) {
      await this.prisma.vehicle.update({
        where: { id: order.vehicle_matched },
        data: { status: 'AVAILABLE' },
      });
    }

    // Emit event
    this.eventEmitter.emit('order.cancelled', {
      orderId: updatedOrder.id,
      previousStatus: order.status,
    });

    // Notify via WebSocket
    this.websocketGateway.notifyOrderStatusChanged(updatedOrder);

    // Send to queue
    await this.queueService.sendToQueue('order-status-changed', {
      orderId: updatedOrder.id,
      status: updatedOrder.status,
      previousStatus: order.status,
      action: 'cancelled',
      timestamp: new Date().toISOString(),
    });
  }

  async matchOrder(id: string): Promise<OrderWithVehicle> {
    // Check if order exists
    const order = await this.findOne(id);

    if (!order) {
      throw new Error('Order not found');
    }

    // Only allow matching for PENDING or MATCHING status
    if (!['PENDING', 'MATCHING'].includes(order.status)) {
      throw new Error(`Order in ${order.status} state cannot be matched`);
    }

    this.logger.log(`Triggering matching for order ${id}`);

    // Update status to MATCHING
    const updatedOrder = await this.updateStatus(id, OrderStatus.MATCHING);

    // Send to matching queue for processing
    await this.queueService.sendToQueue('order-created', {
      orderId: order.id,
      userId: order.user_id,
      status: OrderStatus.MATCHING,
      timestamp: new Date().toISOString(),
    });

    // Return the updated order
    return updatedOrder;
  }

  async getTracking(id: string): Promise<any> {
    // Check if order exists
    const order = await this.findOne(id);

    if (!order) {
      throw new Error('Order not found');
    }

    // In a real implementation, this would fetch tracking data from a tracking service
    // For simplicity, we'll return a mock tracking object based on order status

    const mockStatusHistory: StatusHistoryItem[] = [
      {
        status: 'PENDING', // Use string instead of enum
        timestamp: new Date(order.created_at).toISOString(),
        description: 'Order created',
      },
    ];

    // Add additional status based on current order status
    if (
      ['MATCHING', 'MATCHED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'].includes(
        order.status,
      )
    ) {
      mockStatusHistory.push({
        status: 'MATCHING', // Use string instead of enum
        timestamp: this.getRandomPastDate(order.created_at),
        description: 'Finding the best vehicle',
      });
    }

    if (
      ['MATCHED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'].includes(order.status)
    ) {
      mockStatusHistory.push({
        status: 'MATCHED', // Use string instead of enum
        timestamp: this.getRandomPastDate(order.created_at),
        description: 'Vehicle matched and assigned',
      });
    }

    if (['IN_TRANSIT', 'DELIVERED'].includes(order.status)) {
      mockStatusHistory.push({
        status: 'IN_TRANSIT', // Use string instead of enum
        timestamp: this.getRandomPastDate(order.created_at),
        description: 'Package in transit',
      });
    }

    if (order.status === OrderStatus.DELIVERED) {
      mockStatusHistory.push({
        status: 'DELIVERED', // Use string instead of enum
        timestamp: this.getRandomPastDate(order.created_at),
        description: 'Package delivered successfully',
      });
    }

    if (order.status === OrderStatus.CANCELLED) {
      mockStatusHistory.push({
        status: 'CANCELLED', // Use string instead of enum
        timestamp: this.getRandomPastDate(order.created_at),
        description: 'Order cancelled',
      });
    }

    // Sort by timestamp
    mockStatusHistory.sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );

    return {
      orderId: order.id,
      currentStatus: order.status,
      statusHistory: mockStatusHistory,
      estimatedDelivery: this.getEstimatedDelivery(order),
      vehicleDetails:
        order.vehicle_matched && order.vehicle
          ? {
              id: order.vehicle.id,
              type: order.vehicle.vehicle_type,
              driverId: order.vehicle.driver_id,
            }
          : null,
      // In a real implementation, this would include current location info
      currentLocation:
        order.vehicle_matched && order.status === OrderStatus.IN_TRANSIT
          ? {
              latitude: 13.756331,
              longitude: 100.501762,
              lastUpdated: new Date().toISOString(),
            }
          : null,
    };
  }

  // Helper methods

  private validateStatusTransition(
    currentStatus: OrderStatus,
    newStatus: OrderStatus,
  ): void {
    // Explicitly type the validTransitions object
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]: [OrderStatus.MATCHING, OrderStatus.CANCELLED],
      [OrderStatus.MATCHING]: [
        OrderStatus.MATCHED,
        OrderStatus.PENDING,
        OrderStatus.CANCELLED,
      ],
      [OrderStatus.MATCHED]: [OrderStatus.IN_TRANSIT, OrderStatus.CANCELLED],
      [OrderStatus.IN_TRANSIT]: [OrderStatus.DELIVERED],
      [OrderStatus.DELIVERED]: [], // Terminal state, no transitions
      [OrderStatus.CANCELLED]: [], // Terminal state, no transitions
    };

    if (!validTransitions[currentStatus].includes(newStatus)) {
      throw new Error(
        `Invalid status transition from ${currentStatus} to ${newStatus}`,
      );
    }
  }

  private getRandomPastDate(startDate: Date): string {
    const start = new Date(startDate).getTime();
    const now = new Date().getTime();
    const randomTime = start + Math.random() * (now - start);
    return new Date(randomTime).toISOString();
  }

  private getEstimatedDelivery(order: Order): string | null {
    if (['CANCELLED', 'DELIVERED'].includes(order.status)) {
      return null;
    }

    // Mock estimated delivery time (24-48 hours from order creation)
    const createdAt = new Date(order.created_at);
    const deliveryHours = 24 + Math.floor(Math.random() * 24);
    const estimatedDelivery = new Date(createdAt);
    estimatedDelivery.setHours(estimatedDelivery.getHours() + deliveryHours);

    return estimatedDelivery.toISOString();
  }
}
