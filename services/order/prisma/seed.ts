import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

const cargoTypes = [
  'Fragile', 
  'Electronics', 
  'Furniture', 
  'Perishable', 
  'Documents', 
  'Machinery', 
  'Clothing'
];

const orderStatuses = [
  'pending', 
  'processing', 
  'in_transit', 
  'delivered', 
  'cancelled'
];

async function seedDatabase() {
  console.log('🌱 Starting database seeding...');

  await prisma.price_calculations.deleteMany();
  await prisma.order_status_history.deleteMany();
  await prisma.order_items.deleteMany();
  await prisma.orders.deleteMany();

  const customers = Array.from({ length: 10 }).map((_, index) => ({
    customer_id: Number(index + 1),
    name: faker.person.fullName(),
    email: faker.internet.email(),
    phone: faker.phone.number()
  }));

  const orders = [];
  for (let i = 0; i < 30; i++) {
    const customerId = Number(faker.number.int({ min: 1, max: 10 }));
    const requestedPickupDate = faker.date.future();
    const deliveryDeadline = new Date(requestedPickupDate.getTime() + faker.number.int({ min: 1, max: 7 }) * 24 * 60 * 60 * 1000);
    const status = faker.helpers.arrayElement(orderStatuses);

    const order = {
      customer_id: customerId,
      pickup_location: faker.location.streetAddress(),
      delivery_location: faker.location.streetAddress(),
      requested_pickup_date: requestedPickupDate,
      delivery_deadline: deliveryDeadline,
      status: status,
      total_price: 0 
    };

    orders.push(order);
  }


  const createdOrders = await Promise.all(
    orders.map(async (order) => {
      const itemCount = faker.number.int({ min: 1, max: 3 });
      const orderItems = Array.from({ length: itemCount }).map(() => ({
        cargo_type: faker.helpers.arrayElement(cargoTypes),
        weight_kg: faker.number.float({ min: 0.1, max: 500, fractionDigits: 1 }),
        dimensions_cm: `${faker.number.int({ min: 10, max: 200 })}x${faker.number.int({ min: 10, max: 200 })}x${faker.number.int({ min: 10, max: 200 })}`,
        special_requirements: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.3 }) || null,
        item_price: parseFloat(faker.commerce.price({ min: 10, max: 1000 })),
        status: faker.helpers.arrayElement(['pending', 'in_transit', 'delivered'])
      }));

      const totalWeight = orderItems.reduce((sum, item) => sum + item.weight_kg, 0);
      const totalDistance = faker.number.int({ min: 10, max: 2000 });
      const urgencyHours = faker.number.int({ min: 12, max: 168 });

      const basePrice = 50.00;
      const distanceFactor = (totalDistance / 10) * 0.5;
      const weightFactor = totalWeight * 0.1;
      const urgencyFactor = urgencyHours < 24 ? (24 / urgencyHours) * 1.5 : 0;
      const finalPrice = basePrice + distanceFactor + weightFactor + urgencyFactor;

      return prisma.orders.create({
        data: {
          ...order,
          total_price: finalPrice,
          order_items: {
            create: orderItems
          },
          order_status_history: {
            create: {
              status: order.status,
              changed_at: new Date(),
              changed_by: order.customer_id,
              notes: 'Initial order creation'
            }
          },
          price_calculations: {
            create: {
              base_price: basePrice,
              distance_factor: distanceFactor,
              weight_factor: weightFactor,
              urgency_factor: urgencyFactor,
              final_price: finalPrice
            }
          }
        }
      });
    })
  );

  console.log(`🌟 Seeded ${createdOrders.length} orders successfully!`);
}

seedDatabase()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

export default seedDatabase;