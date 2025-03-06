// prisma/seed.ts
import { PrismaClient, OrderStatus, TrackingStatus } from "@prisma/client";
import { faker } from "@faker-js/faker";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seeding...");
  
  try {
    console.log("Cleaning up existing data...");
    await prisma.tracking.deleteMany({});
    await prisma.orderItem.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.product.deleteMany({});
    console.log("✅ Database cleaned");
    
    // 1. Generate Products
    console.log("Generating Products...");
    const productCategories = [
      'Electronics',
      'Clothing',
      'Home',
      'Beauty',
      'Sports'
    ];
    
    const products = Array.from({ length: 50 }).map(() => {
      const category = faker.helpers.arrayElement(productCategories);
      return {
        name: `${category} ${faker.commerce.productName()}`,
        description: faker.commerce.productDescription(),
        price: parseFloat(faker.commerce.price()),
        stock: faker.number.int({ min: 0, max: 100 }),
        image_url: `https://source.unsplash.com/random/800x600?${category.toLowerCase()}`,
      };
    });
    
    await prisma.product.createMany({
      data: products,
    });
    
    console.log(`✅ Created ${products.length} products`);
    
    // Fetch the created products to use their IDs
    const createdProducts = await prisma.product.findMany();
    
    // 2. Generate Orders
    console.log("Generating Orders...");
    // Use proper OrderStatus enum values instead of strings
    const orderStatusValues = [
      OrderStatus.PENDING,
      OrderStatus.SHIPPED,
      OrderStatus.COMPLETED,
      OrderStatus.CANCELLED
    ];
    
    const orders = Array.from({ length: 20 }).map(() => {
      // Calculate a random date in the past 60 days
      const daysAgo = faker.number.int({ min: 1, max: 60 });
      const orderDate = new Date();
      orderDate.setDate(orderDate.getDate() - daysAgo);
      
      return {
        customer_id: faker.number.int({ min: 1, max: 100 }),
        order_date: orderDate,
        total_amount: 0, // Will be calculated later based on order items
        status: faker.helpers.arrayElement(orderStatusValues),
      };
    });
    
    // Create orders one by one
    const createdOrders = [];
    for (const orderData of orders) {
      const order = await prisma.order.create({
        data: orderData,
      });
      createdOrders.push(order);
    }
    
    console.log(`✅ Created ${createdOrders.length} orders`);
    
    // 3. Generate Order Items
    console.log("Generating Order Items...");
    const orderItems = [];
    
    // Create 1-5 items for each order
    for (const order of createdOrders) {
      const numItems = faker.number.int({ min: 1, max: 5 });
      let orderTotal = 0;
      
      // Select random products for this order
      const selectedProducts = faker.helpers.arrayElements(createdProducts, numItems);
      
      for (const product of selectedProducts) {
        const quantity = faker.number.int({ min: 1, max: 3 });
        const item = {
          order_id: order.order_id,
          product_id: product.product_id,
          quantity: quantity,
          price_per_unit: product.price,
        };
        
        orderItems.push(item);
        orderTotal += product.price * quantity;
      }
      
      // Update order with calculated total
      await prisma.order.update({
        where: { order_id: order.order_id },
        data: { total_amount: parseFloat(orderTotal.toFixed(2)) },
      });
    }
    
    // Create order items
    await prisma.orderItem.createMany({
      data: orderItems,
    });
    
    console.log(`✅ Created ${orderItems.length} order items`);
    
    // 4. Generate Tracking Data
    console.log("Generating Tracking Data...");
    // Use proper TrackingStatus enum values
    const trackingData = createdOrders
      .filter(order => order.status !== OrderStatus.PENDING) // Only add tracking for non-pending orders
      .map(order => {
        let trackingStatus;
        
        // Set tracking status based on order status
        if (order.status === OrderStatus.COMPLETED) {
          trackingStatus = TrackingStatus.DELIVERED;
        } else if (order.status === OrderStatus.CANCELLED) {
          trackingStatus = TrackingStatus.CANCELLED;
        } else {
          trackingStatus = TrackingStatus.IN_TRANSIT;
        }
        
        return {
          order_id: order.order_id,
          latitude: parseFloat(faker.location.latitude({ min: 13.0, max: 20.0 }).toFixed(6)), // Thailand latitude range
          longitude: parseFloat(faker.location.longitude({ min: 97.0, max: 106.0 }).toFixed(6)), // Thailand longitude range
          tracking_status: trackingStatus,
        };
      });
    
    // Create tracking records one by one if needed
    for (const trackingItem of trackingData) {
      await prisma.tracking.create({
        data: trackingItem,
      });
    }
    
    console.log(`✅ Created ${trackingData.length} tracking records`);
    console.log("✨ Database seeding complete!");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });