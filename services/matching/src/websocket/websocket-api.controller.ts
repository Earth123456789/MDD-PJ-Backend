import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('WebSockets')
@Controller('api/websocket')
export class WebsocketApiController {
  @Get('subscribe-to-order')
  @ApiOperation({
    summary: 'Subscribe to order updates',
    description: 'WebSocket event to subscribe to order status updates',
  })
  @ApiResponse({
    status: 200,
    description: `
# Event: subscribeToOrder

## Client sends:
\`\`\`json
{
  "event": "subscribeToOrder",
  "data": "order-uuid-here"
}
\`\`\`

## Server responds:
\`\`\`json
{
  "event": "subscribed",
  "data": {
    "orderId": "order-uuid-here",
    "status": "subscribed"
  }
}
\`\`\`
    `,
  })
  subscribeToOrder() {
    return {
      message:
        'This is WebSocket documentation. Use the WebSocket endpoint to subscribe to orders.',
    };
  }

  @Get('subscribe-to-vehicle')
  @ApiOperation({
    summary: 'Subscribe to vehicle updates',
    description: 'WebSocket event to subscribe to vehicle updates',
  })
  @ApiResponse({
    status: 200,
    description: `
# Event: subscribeToVehicle

## Client sends:
\`\`\`json
{
  "event": "subscribeToVehicle",
  "data": 1234
}
\`\`\`

## Server responds:
\`\`\`json
{
  "event": "subscribed",
  "data": {
    "vehicleId": 1234,
    "status": "subscribed"
  }
}
\`\`\`
    `,
  })
  subscribeToVehicle() {
    return {
      message:
        'This is WebSocket documentation. Use the WebSocket endpoint to subscribe to vehicles.',
    };
  }

  @Get('unsubscribe-from-order')
  @ApiOperation({
    summary: 'Unsubscribe from order updates',
    description: 'WebSocket event to unsubscribe from order status updates',
  })
  @ApiResponse({
    status: 200,
    description: `
# Event: unsubscribeFromOrder

## Client sends:
\`\`\`json
{
  "event": "unsubscribeFromOrder",
  "data": "order-uuid-here"
}
\`\`\`

## Server responds:
\`\`\`json
{
  "event": "unsubscribed",
  "data": {
    "orderId": "order-uuid-here",
    "status": "unsubscribed"
  }
}
\`\`\`
    `,
  })
  unsubscribeFromOrder() {
    return {
      message:
        'This is WebSocket documentation. Use the WebSocket endpoint to unsubscribe from orders.',
    };
  }

  @Get('unsubscribe-from-vehicle')
  @ApiOperation({
    summary: 'Unsubscribe from vehicle updates',
    description: 'WebSocket event to unsubscribe from vehicle updates',
  })
  @ApiResponse({
    status: 200,
    description: `
# Event: unsubscribeFromVehicle

## Client sends:
\`\`\`json
{
  "event": "unsubscribeFromVehicle",
  "data": 1234
}
\`\`\`

## Server responds:
\`\`\`json
{
  "event": "unsubscribed",
  "data": {
    "vehicleId": 1234,
    "status": "unsubscribed"
  }
}
\`\`\`
    `,
  })
  unsubscribeFromVehicle() {
    return {
      message:
        'This is WebSocket documentation. Use the WebSocket endpoint to unsubscribe from vehicles.',
    };
  }

  @Get('server-events')
  @ApiOperation({
    summary: 'Server-to-client events',
    description: 'WebSocket events sent from server to client',
  })
  @ApiResponse({
    status: 200,
    description: `
# Server Events

## orderMatched
\`\`\`json
{
  "event": "orderMatched",
  "data": {
    "orderId": "order-uuid-here",
    "vehicleId": 1234,
    "status": "MATCHED",
    "timestamp": "2023-03-17T14:30:00.000Z"
  }
}
\`\`\`

## vehicleAssigned
\`\`\`json
{
  "event": "vehicleAssigned",
  "data": {
    "orderId": "order-uuid-here",
    "vehicleId": 1234,
    "status": "MATCHED",
    "timestamp": "2023-03-17T14:30:00.000Z"
  }
}
\`\`\`

## orderStatusChanged
\`\`\`json
{
  "event": "orderStatusChanged",
  "data": {
    "orderId": "order-uuid-here",
    "status": "IN_PROGRESS",
    "timestamp": "2023-03-17T14:35:00.000Z"
  }
}
\`\`\`

## vehicleLocationUpdated
\`\`\`json
{
  "event": "vehicleLocationUpdated",
  "data": {
    "vehicleId": 1234,
    "location": {
      "latitude": 40.7128,
      "longitude": -74.0060,
      "accuracy": 10
    },
    "timestamp": "2023-03-17T14:40:00.000Z"
  }
}
\`\`\`
    `,
  })
  serverEvents() {
    return {
      message:
        'This is WebSocket documentation. These events are sent from the server to connected clients.',
    };
  }
}
