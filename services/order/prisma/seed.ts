import { OrderStatus, PrismaClient, TrackingStatus } from "@prisma/client";
import { faker } from "@faker-js/faker";

const prisma = new PrismaClient();

const createMockData = async () => {

  const products: { id: number; name: string; description: string; price: number; stock: number; image_url: string }[] = [];

  for (let i = 0; i < 10; i++) {
    const product = await prisma.product.create({
      data: {
        name: faker.commerce.productName(),
        description: faker.commerce.productDescription() || "", 
        price: parseFloat(faker.commerce.price()),
        stock: faker.number.int({ min: 10, max: 100 }),
        image_url: faker.image.url() || "", 
      },
    });
    products.push({
      id: product.product_id, 
      name: product.name,
      description: product.description || "",
      price: product.price,
      stock: product.stock,
      image_url: product.image_url || ""
    });
  }

  console.log(`Created ${products.length} products`);


  for (let i = 0; i < 10; i++) {
    const customerId = faker.string.uuid();

    const orderItems: { product_id: number; quantity: number; price_per_unit: number }[] = [];
    for (let j = 0; j < 3; j++) {
      const product = faker.helpers.arrayElement(products);
      orderItems.push({
        product_id: product.id,  
        quantity: faker.number.int({ min: 1, max: 5 }),
        price_per_unit: product.price,
      });
    }


    const totalAmount = orderItems.reduce(
      (sum, item) => sum + item.price_per_unit * item.quantity, 
      0
    );


    const order = await prisma.order.create({
      data: {
        customer_id: faker.number.int({ min: 1, max: 5 }),
        total_amount: totalAmount,
        status: faker.helpers.arrayElement(Object.values(OrderStatus)),
        order_items: {
          create: orderItems,
        },
      },
    });

    console.log(`Created order #${order.order_id} for customer ${customerId}`);


    await prisma.tracking.create({
      data: {
        order_id: order.order_id,
        latitude: faker.location.latitude(),
        longitude: faker.location.longitude(),
        tracking_status: faker.helpers.arrayElement(Object.values(TrackingStatus)),
      },
    });

    console.log(`Created tracking for order #${order.order_id}`);
  }

  console.log("Mock data created successfully!");
};

createMockData()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });