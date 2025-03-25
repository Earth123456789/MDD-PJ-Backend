// matching/src/utils/transformers.ts

import { Order, Vehicle } from '@prisma/client';

/**
 * Transforms a Prisma Order object with potentially null vehicle property
 * to a format where vehicle is either defined or undefined
 * (not null, to match WebSocket gateway expectations)
 */
export function transformOrderForWebSocket(
  order: Order & { vehicle: Vehicle | null },
): Order & { vehicle?: Vehicle } {
  // Create a new object without the vehicle property
  const { vehicle, ...orderWithoutVehicle } = order;

  // Create a new object with the correct type
  const transformedOrder: Order & { vehicle?: Vehicle } =
    orderWithoutVehicle as Order;

  // Add vehicle only if it's not null
  if (vehicle !== null) {
    transformedOrder.vehicle = vehicle;
  }

  return transformedOrder;
}
