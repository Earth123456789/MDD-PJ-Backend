// matching/src/websocket/websocket.gateway.ts

import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { Order, Vehicle } from '@prisma/client';

interface ClientToRoomMapping {
  [clientId: string]: {
    rooms: Set<string>;
    socket: Socket;
  };
}

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  namespace: '/matching',
})
export class WebsocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private logger = new Logger('WebsocketGateway');
  private clientToRooms: ClientToRoomMapping = {};

  afterInit() {
    this.logger.log('WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    const clientId = client.id;
    this.logger.log(`Client connected: ${clientId}`);
    this.clientToRooms[clientId] = {
      rooms: new Set<string>(),
      socket: client,
    };

    // Setup event listeners for client
    client.on('joinRoom', (room: string) => this.handleJoinRoom(client, room));
    client.on('leaveRoom', (room: string) =>
      this.handleLeaveRoom(client, room),
    );
  }

  handleDisconnect(client: Socket) {
    const clientId = client.id;
    this.logger.log(`Client disconnected: ${clientId}`);
    delete this.clientToRooms[clientId];
  }

  private handleJoinRoom(client: Socket, room: string) {
    const clientId = client.id;
    client.join(room);
    if (this.clientToRooms[clientId]) {
      this.clientToRooms[clientId].rooms.add(room);
    }
    this.logger.log(`Client ${clientId} joined room: ${room}`);
  }

  private handleLeaveRoom(client: Socket, room: string) {
    const clientId = client.id;
    client.leave(room);
    if (this.clientToRooms[clientId]) {
      this.clientToRooms[clientId].rooms.delete(room);
    }
    this.logger.log(`Client ${clientId} left room: ${room}`);
  }

  /**
   * Notify clients about an order status change
   */
  notifyOrderStatusChanged(order: Order) {
    const orderRoom = `order:${order.id}`;
    const userRoom = `user:${order.user_id}`;
    const statusRoom = `order-status:${order.status}`;

    const payload = {
      event: 'order-status-changed',
      data: {
        orderId: order.id,
        status: order.status,
        previousStatus: order.status, // This would need to be passed in to be accurate
        timestamp: new Date().toISOString(),
        vehicleId: order.vehicle_matched,
      },
    };

    // Broadcast to order-specific room
    this.server.to(orderRoom).emit('message', payload);

    // Broadcast to user-specific room
    this.server.to(userRoom).emit('message', payload);

    // Broadcast to status room (for dashboards, etc.)
    this.server.to(statusRoom).emit('message', payload);

    // Broadcast to admin room
    this.server.to('admin').emit('message', payload);

    this.logger.debug(
      `Notified about order ${order.id} status change to ${order.status}`,
    );
  }

  /**
   * Notify clients about a vehicle being matched with an order
   * Updated to fix the type issues with vehicle property
   */
  notifyVehicleMatched(order: Order & { vehicle?: Vehicle }) {
    const orderRoom = `order:${order.id}`;
    const userRoom = `user:${order.user_id}`;
    const vehicleRoom = order.vehicle_matched
      ? `vehicle:${order.vehicle_matched}`
      : null;
    const driverRoom = order.vehicle?.driver_id
      ? `driver:${order.vehicle.driver_id}`
      : null;

    const payload = {
      event: 'vehicle-matched',
      data: {
        orderId: order.id,
        vehicleId: order.vehicle_matched,
        driverId: order.vehicle?.driver_id,
        status: order.status,
        timestamp: new Date().toISOString(),
      },
    };

    // Broadcast to order-specific room
    this.server.to(orderRoom).emit('message', payload);

    // Broadcast to user-specific room
    this.server.to(userRoom).emit('message', payload);

    // Broadcast to vehicle-specific room if available
    if (vehicleRoom) {
      this.server.to(vehicleRoom).emit('message', payload);
    }

    // Broadcast to driver-specific room if available
    if (driverRoom) {
      this.server.to(driverRoom).emit('message', payload);
    }

    // Broadcast to admin room
    this.server.to('admin').emit('message', payload);

    this.logger.debug(
      `Notified about order ${order.id} being matched with vehicle ${order.vehicle_matched}`,
    );
  }

  /**
   * Notify clients about vehicle status changes
   */
  notifyVehicleStatusChanged(vehicle: Vehicle, orderId?: number) {
    const vehicleRoom = `vehicle:${vehicle.id}`;
    const driverRoom = vehicle.driver_id ? `driver:${vehicle.driver_id}` : null;
    const orderRoom = orderId ? `order:${orderId}` : null;

    const payload = {
      event: 'vehicle-status-changed',
      data: {
        vehicleId: vehicle.id,
        driverId: vehicle.driver_id,
        status: vehicle.status,
        orderId,
        timestamp: new Date().toISOString(),
      },
    };

    // Broadcast to vehicle-specific room
    this.server.to(vehicleRoom).emit('message', payload);

    // Broadcast to driver-specific room if available
    if (driverRoom) {
      this.server.to(driverRoom).emit('message', payload);
    }

    // Broadcast to order-specific room if available
    if (orderRoom) {
      this.server.to(orderRoom).emit('message', payload);
    }

    // Broadcast to admin room
    this.server.to('admin').emit('message', payload);

    this.logger.debug(
      `Notified about vehicle ${vehicle.id} status change to ${vehicle.status}`,
    );
  }

  /**
   * Broadcast a message to all connected clients
   */
  broadcastToAll(event: string, data: any) {
    const payload = {
      event,
      data,
      timestamp: new Date().toISOString(),
    };

    this.server.emit('message', payload);
    this.logger.debug(`Broadcast message to all clients: ${event}`);
  }

  /**
   * Send a message to a specific client
   */
  sendToClient(clientId: string, event: string, data: any) {
    const client = this.clientToRooms[clientId];
    if (!client) {
      this.logger.warn(`Client ${clientId} not found`);
      return;
    }

    const payload = {
      event,
      data,
      timestamp: new Date().toISOString(),
    };

    client.socket.emit('message', payload);
    this.logger.debug(`Sent message to client ${clientId}: ${event}`);
  }

  /**
   * Send a message to a specific room
   */
  sendToRoom(room: string, event: string, data: any) {
    const payload = {
      event,
      data,
      timestamp: new Date().toISOString(),
    };

    this.server.to(room).emit('message', payload);
    this.logger.debug(`Sent message to room ${room}: ${event}`);
  }

  /**
   * Notify about driver location updates
   */
  notifyDriverLocationUpdate(
    driverId: number,
    vehicleId: number,
    location: any,
    orderId?: number,
  ) {
    const driverRoom = `driver:${driverId}`;
    const vehicleRoom = `vehicle:${vehicleId}`;
    const orderRoom = orderId ? `order:${orderId}` : null;

    const payload = {
      event: 'driver-location-updated',
      data: {
        driverId,
        vehicleId,
        orderId,
        location,
        timestamp: new Date().toISOString(),
      },
    };

    // Broadcast to driver-specific room
    this.server.to(driverRoom).emit('message', payload);

    // Broadcast to vehicle-specific room
    this.server.to(vehicleRoom).emit('message', payload);

    // Broadcast to order-specific room if available
    if (orderRoom) {
      this.server.to(orderRoom).emit('message', payload);
    }

    // Broadcast to tracking room
    this.server.to('tracking').emit('message', payload);

    this.logger.debug(`Notified about driver ${driverId} location update`);
  }

  /**
   * Notify about delivery tracking updates
   */
  notifyTrackingUpdate(orderId: number, driverId: number, trackingData: any) {
    const orderRoom = `order:${orderId}`;
    const driverRoom = `driver:${driverId}`;

    const payload = {
      event: 'tracking-updated',
      data: {
        orderId,
        driverId,
        ...trackingData,
        timestamp: new Date().toISOString(),
      },
    };

    // Broadcast to order-specific room
    this.server.to(orderRoom).emit('message', payload);

    // Broadcast to driver-specific room
    this.server.to(driverRoom).emit('message', payload);

    // Broadcast to tracking room
    this.server.to('tracking').emit('message', payload);

    this.logger.debug(`Notified about tracking update for order ${orderId}`);
  }
}
