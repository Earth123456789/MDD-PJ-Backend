import { ApiProperty } from '@nestjs/swagger';

export class OrderSubscriptionDto {
  @ApiProperty({
    description: 'Order ID to subscribe to',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  orderId: string;
}

export class VehicleSubscriptionDto {
  @ApiProperty({
    description: 'Vehicle ID to subscribe to',
    example: 1234,
  })
  vehicleId: number;
}

export class SubscriptionResponseDto {
  @ApiProperty({
    description: 'Unique identifier of the order or vehicle',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Status of the subscription',
    example: 'subscribed',
    enum: ['subscribed', 'unsubscribed'],
  })
  status: string;
}

export class OrderMatchedDto {
  @ApiProperty({
    description: 'Order ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  orderId: string;

  @ApiProperty({
    description: 'ID of the matched vehicle',
    example: 1234,
  })
  vehicleId: number;

  @ApiProperty({
    description: 'Current status of the order',
    example: 'MATCHED',
  })
  status: string;

  @ApiProperty({
    description: 'Timestamp of when the matching occurred',
    example: '2023-03-17T14:30:00.000Z',
  })
  timestamp: string;
}

export class OrderStatusChangedDto {
  @ApiProperty({
    description: 'Order ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  orderId: string;

  @ApiProperty({
    description: 'New status of the order',
    example: 'IN_PROGRESS',
  })
  status: string;

  @ApiProperty({
    description: 'Timestamp of when the status changed',
    example: '2023-03-17T14:35:00.000Z',
  })
  timestamp: string;
}

export class LocationUpdateDto {
  @ApiProperty({
    description: 'Vehicle ID',
    example: 1234,
  })
  vehicleId: number;

  @ApiProperty({
    description: 'Current location of the vehicle',
    example: {
      latitude: 40.7128,
      longitude: -74.006,
      accuracy: 10,
    },
  })
  location: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };

  @ApiProperty({
    description: 'Timestamp of when the location was updated',
    example: '2023-03-17T14:40:00.000Z',
  })
  timestamp: string;
}
