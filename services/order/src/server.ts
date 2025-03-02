require("dotenv").config();
import express from "express";
const cors = require("cors");
const { PrismaClient } = require("@prisma/client");
const swaggerUi = require("swagger-ui-express");
const swaggerDocument = require("../swagger.json");
import axios from "axios";

const prisma = new PrismaClient();
const app = express();
app.use(express.json());
app.use(cors());

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
        const productResponse = await axios.get(
          `http://localhost:3005/products/${item.product_id}`
        );
        const product = productResponse.data;

        return {
          ...item,
          product, 
        };
      })
    );

    const order = await prisma.order.create({
      data: {
        customer_id,
        total_amount,
        status,
        order_items: {
          create: orderItemsWithProductDetails,
        },
      },
      include: { order_items: true },
    });

    res.status(201).json(order);
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// UPDATE an order status
app.put("/orders/:id", async (req, res) => {
  const { id } = req.params;
  const { status, order_items } = req.body; 

  const orderId = parseInt(id, 10);

  try {
    let orderItemsWithProductDetails;
    if (order_items) {
      orderItemsWithProductDetails = await Promise.all(
        order_items.map(async (item: { product_id: number }) => {
          const productResponse = await axios.get(
            `http://localhost:3005/products/${item.product_id}`
          );
          const product = productResponse.data;

          return {
            ...item,
            product,
          };
        })
      );
    }

    const order = await prisma.order.update({
      where: { order_id: orderId },
      data: {
        status,
        order_items: {
          // If you're updating items as well
          update: orderItemsWithProductDetails ? orderItemsWithProductDetails : undefined,
        },
      },
    });

    res.json(order);
  } catch (error) {
    res.status(400).json({
      error: "Invalid order status. Valid values are: PENDING, SHIPPED, COMPLETED, CANCELLED",
    });
  }
});


// DELETE an order
app.delete("/orders/:id", async (req, res) => {
  const { id } = req.params;
  const orderId = parseInt(id, 10); // Convert ID to integer
  await prisma.order.delete({ where: { order_id: orderId } });
  res.json({ message: "Order deleted" });
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
