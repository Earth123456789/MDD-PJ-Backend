import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('WebSocket Documentation')
@Controller('api/docs/websocket')
export class WebsocketDocController {
  @Get()
  @ApiOperation({
    summary: 'WebSocket Events Documentation',
    description: `
# WebSocket Events

## Client to Server Events
- subscribeToOrder: Subscribe to an order's updates
- subscribeToVehicle: Subscribe to a vehicle's updates
- unsubscribeFromOrder: Unsubscribe from an order
- unsubscribeFromVehicle: Unsubscribe from a vehicle

## Server to Client Events
- orderMatched: Emitted when an order is matched with a vehicle
- vehicleAssigned: Emitted when a vehicle is assigned to an order
- orderStatusChanged: Emitted when order status changes
- vehicleLocationUpdated: Emitted when a vehicle's location is updated

Connect to WebSocket endpoint: ws://[host]/
    `,
  })
  getWebSocketDocs() {
    return {
      message: 'WebSocket documentation is available in the description above',
    };
  }
}
