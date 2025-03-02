import { PrismaClient } from "@prisma/client";
import { faker } from "@faker-js/faker";
import axios from "axios";

const prisma = new PrismaClient();

async function main() {
  // Generate mock orders
  const orders = Array.from({ length: 10 }).map(() => ({
    customer_id: faker.number.int({ min: 1, max: 100 }),
    order_date: faker.date.recent(),
    total_amount: parseFloat(faker.commerce.price()),
    status: faker.helpers.arrayElement([
      "PENDING",
      "SHIPPED",
      "COMPLETED",
      "CANCELLED",
    ]),
  }));

  await prisma.order.createMany({
    data: orders,
  });

  console.log(`${orders.length} orders have been created!`);

  const insertedOrders = await prisma.order.findMany({
    where: {
      customer_id: {
        in: orders.map((order) => order.customer_id),
      },
    },
  });

  const productIds = Array.from({ length: 49 }).map(() =>
    faker.number.int({ min: 1, max: 50 }),
  );
  const uniqueProductIds = Array.from(new Set(productIds));

  let products;
  try {
    const productResponses = await Promise.all(
      uniqueProductIds.map((productId) =>
        axios.get(`http://localhost:3005/products/${productId}`),
      ),
    );
    products = productResponses.map((response) => response.data);
  } catch (error) {
    console.error("Error fetching products:", error);
    return;
  }

  const validOrderIds: number[] = insertedOrders.map((order) => order.order_id);

  const orderItems = Array.from({ length: 10 }).map(() => {
    const productId = faker.helpers.arrayElement(uniqueProductIds);

    const product = products.find((prod) => prod.id === productId);

    const price_per_unit = product ? product.price : 0;

    return {
      order_id: faker.helpers.arrayElement(validOrderIds) as number,
      product_id: productId,
      quantity: faker.number.int({ min: 1, max: 5 }),
      price_per_unit,
    };
  });

  for (const item of orderItems) {
    await prisma.orderItem.create({
      data: item,
    });
  }

  console.log(`${orderItems.length} order items have been created!`);

  const trackingData = insertedOrders.map((order) => ({
    order_id: order.order_id,
    latitude: parseFloat(faker.location.latitude().toString()),
    longitude: parseFloat(faker.location.longitude().toString()),
    tracking_status: faker.helpers.arrayElement([
      "IN_TRANSIT",
      "DELIVERED",
      "CANCELLED",
    ]),
  }));

  const insertedTracking = await prisma.tracking.createMany({
    data: trackingData,
  });

  console.log(`${insertedTracking.count} tracking records have been created!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
