require("dotenv").config();
import express from "express";
const cors = require("cors");
const { PrismaClient } = require("@prisma/client");
const swaggerUi = require("swagger-ui-express");
const swaggerDocument = require("../swagger.json");
import axios from "axios";
import amqp from "amqplib";

const prisma = new PrismaClient();
const app = express();
app.use(express.json());
app.use(cors());

// Set up RabbitMQ connection
let channel: amqp.Channel;

async function connectRabbitMQ() {
  let retries = 5;
  while (retries) {
    try {
      const connection = await amqp.connect("amqp://admin:admin@rabbitmq:5672");
      channel = await connection.createChannel();
      await channel.assertQueue("orderQueue", { durable: true });
      console.log("Connected to RabbitMQ");
      break;
    } catch (error) {
      console.error("Failed to connect to RabbitMQ:", error);
      retries -= 1;
      if (retries === 0) {
        console.error("Unable to connect to RabbitMQ after several attempts.");
      } else {
        console.log(`Retrying in 5 seconds... (${retries} retries left)`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }
}


// Call this function to connect when the app starts
connectRabbitMQ();

// Swagger setup
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Middleware for CORS
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

/**
 * CRUD for Orders and Tracking
 */

// GET all orders
app.get("/orders", async (req, res) => {
  const orders = await prisma.order.findMany({
    include: { order_items: true },
  });
  res.json(orders);
});

// GET single order by ID
app.get("/orders/:id", async (req, res) => {
  const { id } = req.params;
  const orderId = parseInt(id, 10);
  const order = await prisma.order.findUnique({
    where: { order_id: orderId },
    include: { order_items: true },
  });
  order ? res.json(order) : res.status(404).json({ error: "Order not found" });
});

// CREATE a new order
app.post("/orders", async (req, res) => {
  const { customer_id, order_items, status } = req.body;

  const total_amount = order_items.reduce(
    (acc: number, item: { quantity: number; price_per_unit: number }) =>
      acc + item.quantity * item.price_per_unit,
    0,
  );

  try {
    const orderItemsWithProductDetails = await Promise.all(
      order_items.map(async (item: { product_id: number }) => {
        try {
          const productResponse = await axios.get(
            // ใช้ npm run dev
            // `http://localhost:3005/products/${item.product_id}`
            // เดี๋ยวมาแก้ ตอน refactor
            //  `http://product:3005/products/${item.product_id}`
             `http://172.29.0.3:3005/products/${item.product_id}`
          );


          if (!productResponse.data) {
            throw new Error(`Product with id ${item.product_id} not found`);
          }

          const product = productResponse.data;

          return {
            ...item,
            product,
          };
        } catch (error) {
          console.error(`Error fetching product with id ${item.product_id}:`, (error as Error).message);
          throw new Error(`Product with id ${item.product_id} not found`);
        }
      }),
    );

    const order = await prisma.order.create({
      data: {
        customer_id,
        total_amount,
        status,
        order_items: {
          create: orderItemsWithProductDetails.map(item => ({
            product_id: item.product_id,
            quantity: item.quantity,
            price_per_unit: item.price_per_unit,
          })),
        },
      },
      include: { order_items: true },
    });

    // Publish the order creation message to RabbitMQ
    const orderMessage = JSON.stringify(order);
    channel.sendToQueue("orderQueue", Buffer.from(orderMessage), {
      persistent: true, // Ensure the message is saved in case of RabbitMQ restart
    });

    res.status(201).json(order); // Return the created order
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error creating order:", error.message);
    } else {
      console.error("Error creating order:", error);
    }
    res.status(500).json({ error: "Internal server error. Please check the logs." });
  }
});

// UPDATE an order status
app.put("/orders/:id", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const orderId = parseInt(id, 10);

  try {
    const order = await prisma.order.update({
      where: { order_id: orderId },
      data: { status },
    });
    res.json(order);
  } catch (error) {
    res.status(400).json({
      error: "Invalid order status. Valid values are: PENDING, SHIPPED, COMPLETED, CANCELLED"
    });
  }
});

// DELETE an order
app.delete("/orders/:id", async (req, res) => {
  const { id } = req.params;
  const orderId = parseInt(id, 10); // Convert ID to integer

  try {
    const deletedOrder = await prisma.order.delete({ where: { order_id: orderId } });

    // Publish the order deletion message to RabbitMQ
    const deleteMessage = JSON.stringify({ orderId });
    channel.sendToQueue("orderQueue", Buffer.from(deleteMessage), {
      persistent: true, // Ensure the message is saved in case of RabbitMQ restart
    });

    res.json({ message: "Order deleted", deletedOrder });
  } catch (error) {
    res.status(404).json({ error: "Order not found" });
  }
});


// GET all order items by order ID
app.get(
  "/orders/:id/items",
  async (req: express.Request, res: express.Response) => {
    const { id } = req.params;
    const orderId = parseInt(id, 10); // Convert ID to integer

    try {
      // Fetch Order Items from Prisma
      const items = await prisma.orderItem.findMany({
        where: { order_id: orderId },
      });

      // Fetch product data for each order item
      const itemsWithProductDetails = await Promise.all(
        items.map(async (item: { product_id: number }) => {
          // Fetch product details from the Product Service via Traefik
          const productResponse = await axios.get(
            `http://product.localhost/products/${item.product_id}` ||
            `http://localhost:3005/products/${item.product_id}`,
          );
          const product = productResponse.data;

          return {
            ...item,
            product,
          };
        }),
      );

      // Return the enhanced items with product details
      res.json(itemsWithProductDetails);
    } catch (error) {
      console.error("Error fetching order items or product data:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// GET all tracking
app.get("/tracking", async (req, res) => {
  try {
    const tracking = await prisma.tracking.findMany();
    res.json(tracking);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch tracking data" });
  }
});

// GET tracking info for an order
app.get("/tracking/:order_id", async (req, res) => {
  const { order_id } = req.params;
  const orderId = parseInt(order_id, 10); // Convert ID to integer
  const tracking = await prisma.tracking.findUnique({
    where: { order_id: orderId },
  });

  tracking
    ? res.json(tracking)
    : res.status(404).json({ error: "Tracking not found" });
});

// CREATE tracking for an order
app.post("/tracking", async (req, res) => {
  const { order_id, latitude, longitude, tracking_status } = req.body;
  const orderId = parseInt(order_id, 10);

  try {
    const tracking = await prisma.tracking.create({
      data: { order_id: orderId, latitude, longitude, tracking_status },
    });

    res.status(201).json(tracking);
  } catch (error) {
    res
      .status(400)
      .json({ error: "Error creating tracking. Ensure order_id exists." });
  }
});

// UPDATE tracking status and location
app.put("/tracking/:order_id", async (req, res) => {
  const { order_id } = req.params;
  const { latitude, longitude, tracking_status } = req.body;
  const orderId = parseInt(order_id, 10);

  try {
    const tracking = await prisma.tracking.update({
      where: { order_id: orderId },
      data: { latitude, longitude, tracking_status },
    });

    res.json(tracking);
  } catch (error) {
    res.status(404).json({
      error:
        "Tracking not found or invalid status. Valid values are: IN_TRANSIT, DELIVERED, CANCELLED",
    });
  }
});

// DELETE tracking for an order
app.delete("/tracking/:order_id", async (req, res) => {
  const { order_id } = req.params;
  const orderId = parseInt(order_id, 10);

  try {
    await prisma.tracking.delete({ where: { order_id: orderId } });
    res.json({ message: "Tracking deleted" });
  } catch (error) {
    res.status(404).json({ error: "Tracking not found" });
  }
});

// Start the server
app.listen(3004, () => {
  console.log("Server is running on http://localhost:3004");
  console.log("Swagger docs available at http://localhost:3004/docs");
});
