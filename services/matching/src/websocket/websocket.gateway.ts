import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WsResponse,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { Order } from '@prisma/client';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class WebsocketGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebsocketGateway.name);
  private readonly clientRooms = new Map<string, string[]>();

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    // Remove client from all rooms
    this.clientRooms.delete(client.id);
  }

  @SubscribeMessage('subscribeToOrder')
  handleSubscribeToOrder(client: Socket, orderId: string): WsResponse<any> {
    const room = `order:${orderId}`;
    client.join(room);

    // Track which rooms this client is in
    if (!this.clientRooms.has(client.id)) {
      this.clientRooms.set(client.id, []);
    }
    this.clientRooms.get(client.id)?.push(room); // Optional chaining

    this.logger.log(`Client ${client.id} subscribed to order ${orderId}`);

    return { event: 'subscribed', data: { orderId, status: 'subscribed' } };
  }

  @SubscribeMessage('subscribeToVehicle')
  handleSubscribeToVehicle(client: Socket, vehicleId: number): WsResponse<any> {
    const room = `vehicle:${vehicleId}`;
    client.join(room);

    // Track which rooms this client is in
    if (!this.clientRooms.has(client.id)) {
      this.clientRooms.set(client.id, []);
    }
    this.clientRooms.get(client.id)?.push(room); // Optional chaining

    this.logger.log(`Client ${client.id} subscribed to vehicle ${vehicleId}`);

    return { event: 'subscribed', data: { vehicleId, status: 'subscribed' } };
  }

  @SubscribeMessage('unsubscribeFromOrder')
  handleUnsubscribeFromOrder(client: Socket, orderId: string): WsResponse<any> {
    const room = `order:${orderId}`;
    client.leave(room);

    // Update the rooms this client is in
    const rooms = this.clientRooms.get(client.id);
    if (rooms) {
      const index = rooms.indexOf(room);
      if (index > -1) {
        rooms.splice(index, 1);
      }
    }

    this.logger.log(`Client ${client.id} unsubscribed from order ${orderId}`);

    return { event: 'unsubscribed', data: { orderId, status: 'unsubscribed' } };
  }

  @SubscribeMessage('unsubscribeFromVehicle')
  handleUnsubscribeFromVehicle(
    client: Socket,
    vehicleId: number,
  ): WsResponse<any> {
    const room = `vehicle:${vehicleId}`;
    client.leave(room);

    // Update the rooms this client is in
    const rooms = this.clientRooms.get(client.id);
    if (rooms) {
      const index = rooms.indexOf(room);
      if (index > -1) {
        rooms.splice(index, 1);
      }
    }

    this.logger.log(
      `Client ${client.id} unsubscribed from vehicle ${vehicleId}`,
    );

    return {
      event: 'unsubscribed',
      data: { vehicleId, status: 'unsubscribed' },
    };
  }

  notifyVehicleMatched(order: Order): void {
    const orderRoom = `order:${order.id}`;
    const vehicleRoom = `vehicle:${order.vehicle_matched}`;

    const payload = {
      orderId: order.id,
      vehicleId: order.vehicle_matched,
      status: order.status,
      timestamp: new Date().toISOString(),
    };

    this.server.to(orderRoom).emit('orderMatched', payload);
    this.server.to(vehicleRoom).emit('vehicleAssigned', payload);

    this.logger.log(
      `Notified rooms ${orderRoom} and ${vehicleRoom} about matching`,
    );
  }

  notifyOrderStatusChanged(order: Order): void {
    const orderRoom = `order:${order.id}`;

    const payload = {
      orderId: order.id,
      status: order.status,
      timestamp: new Date().toISOString(),
    };

    this.server.to(orderRoom).emit('orderStatusChanged', payload);

    if (order.vehicle_matched) {
      const vehicleRoom = `vehicle:${order.vehicle_matched}`;
      this.server.to(vehicleRoom).emit('orderStatusChanged', payload);
    }

    this.logger.log(`Notified about order status change for ${order.id}`);
  }

  notifyVehicleLocationUpdate(vehicleId: number, location: any): void {
    const vehicleRoom = `vehicle:${vehicleId}`;

    const payload = {
      vehicleId,
      location,
      timestamp: new Date().toISOString(),
    };

    this.server.to(vehicleRoom).emit('vehicleLocationUpdated', payload);

    // Find all order rooms associated with this vehicle and notify them too
    this.server.sockets.adapter.rooms.forEach((_, room) => {
      if (room.startsWith('order:')) {
        this.server.to(room).emit('vehicleLocationUpdated', payload);
      }
    });

    this.logger.log(`Notified about vehicle location update for ${vehicleId}`);
  }
}
