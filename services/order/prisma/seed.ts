import { PrismaClient } from "@prisma/client";
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

const createMockData = async () => {
    // Creating a few customers and orders
    for (let i = 0; i < 10; i++) {
        const customerId = faker.string.uuid(); 

        // Create an order
        const order = await prisma.order.create({
            data: {
                customer_id: customerId,
                total_amount: parseFloat(faker.commerce.price()),
                status: faker.helpers.arrayElement(["pending", "completed", "shipped", "cancelled"]),
                order_items: {
                    create: Array.from({ length: 3 }).map(() => ({
                        product_id: faker.string.uuid(),
                        quantity: faker.number.int({ min: 1, max: 5 }),
                        price_per_unit: parseFloat(faker.commerce.price()),
                    })),
                },
            },
        });

        // Create tracking for the order
        await prisma.tracking.create({
            data: {
                order_id: order.order_id,
                latitude: faker.location.latitude(),
                longitude: faker.location.longitude(),
                tracking_status: faker.helpers.arrayElement(["In Transit", "Delivered", "Out for Delivery"]),
            },
        });
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
