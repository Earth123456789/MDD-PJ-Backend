import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import swaggerUi from "swagger-ui-express";
import swaggerDocument from "../swagger.json";

dotenv.config();

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});
const app = express();

app.use(express.json());
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// Swagger setup
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use(express.json());
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// Type definitions for request bodies
interface OrderItemInput {
  cargo_type: string;
  weight_kg: number;
  dimensions_cm: string;
  special_requirements?: string;
  item_price: number;
  status: string;
}

interface OrderStatusHistoryInput {
  status: string;
  changed_at: string;
  changed_by: number;
  notes?: string;
}

interface PriceCalculationInput {
  base_price: number;
  distance_factor: number;
  weight_factor: number;
  urgency_factor: number;
  final_price: number;
}

interface OrderInput {
  customer_id: number;
  pickup_location: string;
  delivery_location: string;
  requested_pickup_date: string;
  delivery_deadline: string;
  total_price: number;
  status: string;
  order_items?: OrderItemInput[];
  order_status_history?: OrderStatusHistoryInput[];
  price_calculations?: PriceCalculationInput[];
}

/**
 * CRUD for Orders
 */

// GET all orders
app.get("/orders", async (req, res) => {
  try {
    // First, check database connection
    await prisma.$connect();

    const orders = await prisma.orders.findMany({
      include: { 
        order_items: true,
        order_status_history: true,
        price_calculations: true
      }
    });
    res.json(orders);
  } catch (error) {
    console.error('Full error details:', error);
    
    // More detailed error response
    if (error instanceof Error) {
      res.status(500).json({ 
        error: "Failed to fetch orders", 
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    } else {
      res.status(500).json({ 
        error: "Failed to fetch orders", 
        details: "Unknown error occurred" 
      });
    }
  } finally {
    // Ensure database connection is closed
    await prisma.$disconnect();
  }
});

// GET single order by ID
app.get("/orders/:id", async (req, res) => {
  const { id } = req.params;
  const orderId = parseInt(id, 10);
  
  try {
    const order = await prisma.orders.findUnique({
      where: { order_id: orderId },
      include: { 
        order_items: true,
        order_status_history: true,
        price_calculations: true
      }
    });
    
    order 
      ? res.json(order) 
      : res.status(404).json({ error: "Order not found" });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch order" });
  }
});

// CREATE a new order
app.post("/orders", async (req, res) => {
  const { 
    customer_id, 
    pickup_location, 
    delivery_location, 
    requested_pickup_date, 
    delivery_deadline,
    total_price,
    status,
    order_items,
    order_status_history,
    price_calculations
  }: OrderInput = req.body;

  try {
    const order = await prisma.orders.create({
      data: {
        customer_id: customer_id,
        pickup_location,
        delivery_location,
        requested_pickup_date: new Date(requested_pickup_date),
        delivery_deadline: new Date(delivery_deadline),
        total_price,
        status,
        order_items: {
          create: order_items?.map((item: OrderItemInput) => ({
            cargo_type: item.cargo_type,
            weight_kg: item.weight_kg,
            dimensions_cm: item.dimensions_cm,
            special_requirements: item.special_requirements,
            item_price: item.item_price,
            status: item.status
          })) || []
        },
        order_status_history: {
          create: order_status_history?.map((history: OrderStatusHistoryInput) => ({
            status: history.status,
            changed_at: new Date(history.changed_at),
            changed_by: history.changed_by,
            notes: history.notes
          })) || []
        },
        price_calculations: {
          create: price_calculations?.map((calc: PriceCalculationInput) => ({
            base_price: calc.base_price,
            distance_factor: calc.distance_factor,
            weight_factor: calc.weight_factor,
            urgency_factor: calc.urgency_factor,
            final_price: calc.final_price
          })) || []
        }
      },
      include: {
        order_items: true,
        order_status_history: true,
        price_calculations: true
      }
    });

    res.status(201).json(order);
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ error: "Internal server error", details: error });
  }
});

// UPDATE an order
app.put("/orders/:id", async (req, res) => {
  const { id } = req.params;
  const orderId = parseInt(id, 10);
  
  const { 
    customer_id, 
    pickup_location, 
    delivery_location, 
    requested_pickup_date, 
    delivery_deadline,
    total_price,
    status
  }: Partial<OrderInput> = req.body;

  try {
    const updatedOrder = await prisma.orders.update({
      where: { order_id: orderId },
      data: {
        ...(customer_id && { customer_id }),
        ...(pickup_location && { pickup_location }),
        ...(delivery_location && { delivery_location }),
        ...(requested_pickup_date && { requested_pickup_date: new Date(requested_pickup_date) }),
        ...(delivery_deadline && { delivery_deadline: new Date(delivery_deadline) }),
        ...(total_price && { total_price }),
        ...(status && { status })
      },
      include: {
        order_items: true,
        order_status_history: true,
        price_calculations: true
      }
    });

    res.json(updatedOrder);
  } catch (error) {
    console.error("Error updating order:", error);
    res.status(400).json({ error: "Failed to update order" });
  }
});

// DELETE an order
app.delete("/orders/:id", async (req, res) => {
  const { id } = req.params;
  const orderId = parseInt(id, 10);

  try {
    // Delete related records first due to foreign key constraints
    await prisma.order_status_history.deleteMany({
      where: { order_id: orderId }
    });
    
    await prisma.price_calculations.deleteMany({
      where: { order_id: orderId }
    });
    
    await prisma.order_items.deleteMany({
      where: { order_id: orderId }
    });

    // Then delete the order
    const deletedOrder = await prisma.orders.delete({
      where: { order_id: orderId }
    });

    res.json({ message: "Order deleted", deletedOrder });
  } catch (error) {
    console.error("Error deleting order:", error);
    res.status(404).json({ error: "Order not found" });
  }
});

/**
 * Routes for Order Items
 */

// GET order items for a specific order
app.get("/orders/:id/items", async (req, res) => {
  const { id } = req.params;
  const orderId = parseInt(id, 10);

  try {
    const items = await prisma.order_items.findMany({
      where: { order_id: orderId }
    });

    res.json(items);
  } catch (error) {
    console.error("Error fetching order items:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ADD/UPDATE order items
app.post("/orders/:id/items", async (req, res) => {
  const { id } = req.params;
  const orderId = parseInt(id, 10);
  const items: OrderItemInput[] = req.body;

  try {
    const createdItems = await Promise.all(
      items.map((item: OrderItemInput) => 
        prisma.order_items.create({
          data: {
            order_id: orderId,
            cargo_type: item.cargo_type,
            weight_kg: item.weight_kg,
            dimensions_cm: item.dimensions_cm,
            special_requirements: item.special_requirements,
            item_price: item.item_price,
            status: item.status
          }
        })
      )
    );

    res.status(201).json(createdItems);
  } catch (error) {
    console.error("Error adding order items:", error);
    res.status(400).json({ error: "Failed to add order items" });
  }
});

/**
 * Routes for Order Status History
 */

// GET status history for a specific order
app.get("/orders/:id/status-history", async (req, res) => {
  const { id } = req.params;
  const orderId = parseInt(id, 10);

  try {
    const statusHistory = await prisma.order_status_history.findMany({
      where: { order_id: orderId }
    });

    res.json(statusHistory);
  } catch (error) {
    console.error("Error fetching status history:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ADD status history entry
app.post("/orders/:id/status-history", async (req, res) => {
  const { id } = req.params;
  const orderId = parseInt(id, 10);
  const { status, changed_by, notes }: OrderStatusHistoryInput = req.body;

  try {
    const statusEntry = await prisma.order_status_history.create({
      data: {
        order_id: orderId,
        status,
        changed_at: new Date(),
        changed_by: changed_by,
        notes
      }
    });

    res.status(201).json(statusEntry);
  } catch (error) {
    console.error("Error adding status history:", error);
    res.status(400).json({ error: "Failed to add status history" });
  }
});

/**
 * Routes for Price Calculations
 */

// GET price calculations for a specific order
app.get("/orders/:id/price-calculations", async (req, res) => {
  const { id } = req.params;
  const orderId = parseInt(id, 10);

  try {
    const priceCalculations = await prisma.price_calculations.findMany({
      where: { order_id: orderId }
    });

    res.json(priceCalculations);
  } catch (error) {
    console.error("Error fetching price calculations:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ADD price calculation entry
app.post("/orders/:id/price-calculations", async (req, res) => {
  const { id } = req.params;
  const orderId = parseInt(id, 10);
  const { 
    base_price, 
    distance_factor, 
    weight_factor, 
    urgency_factor, 
    final_price 
  }: PriceCalculationInput = req.body;

  try {
    const priceCalculation = await prisma.price_calculations.create({
      data: {
        order_id: orderId,
        base_price,
        distance_factor,
        weight_factor,
        urgency_factor,
        final_price
      }
    });

    res.status(201).json(priceCalculation);
  } catch (error) {
    console.error("Error adding price calculation:", error);
    res.status(400).json({ error: "Failed to add price calculation" });
  }
});

// Start the server
const PORT = process.env.PORT || 3004;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`See Document API at http://localhost:${PORT}/docs`);
});

export default app;