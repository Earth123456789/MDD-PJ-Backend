require("dotenv").config();
import express from "express";
const cors = require("cors");
const { PrismaClient } = require("@prisma/client");
const swaggerUi = require("swagger-ui-express");
const swaggerDocument = require("./swagger.json");

const prisma = new PrismaClient();
const app = express();
app.use(express.json());
app.use(cors());

// Swagger setup
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

/**
 * GET all orders
 */
app.get("/orders", async (req, res) => {
    const orders = await prisma.order.findMany({
        include: { order_items: true },
    });
    res.json(orders);
});

/**
 * GET single order by ID
 */
app.get("/orders/:id", async (req, res) => {
    const { id } = req.params;
    const order = await prisma.order.findUnique({
        where: { order_id: id },
        include: { order_items: true },
    });
    order ? res.json(order) : res.status(404).json({ error: "Order not found" });
});

/**
 * CREATE a new order
 */
app.post("/orders", async (req, res) => {
    const { customer_id, order_items, status } = req.body;

    const total_amount = order_items.reduce(
        (acc: number, item: { quantity: number; price_per_unit: number }) => acc + item.quantity * item.price_per_unit,
        0
    );

    const order = await prisma.order.create({
        data: {
            customer_id,
            total_amount,
            status,
            order_items: { create: order_items },
        },
        include: { order_items: true },
    });

    res.status(201).json(order);
});

/**
 * UPDATE an order status
 */
app.put("/orders/:id", async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const order = await prisma.order.update({
        where: { order_id: id },
        data: { status },
    });

    res.json(order);
});

/**
 * DELETE an order
 */
app.delete("/orders/:id", async (req, res) => {
    const { id } = req.params;
    await prisma.order.delete({ where: { order_id: id } });
    res.json({ message: "Order deleted" });
});

/**
 * GET all order items by order ID
 */
app.get("/orders/:id/items", async (req: express.Request, res: express.Response) => {
    const { id } = req.params;
    const items = await prisma.orderItem.findMany({
        where: { order_id: id },
    });
    res.json(items);
});

/**
 * GET all tracking
 */
app.get("/tracking", async (req, res) => {
    try {
        const tracking = await prisma.tracking.findMany();
        res.json(tracking);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch tracking data" });
    }
});


/**
 * GET tracking info for an order
 */
app.get("/tracking/:order_id", async (req, res) => {
    const { order_id } = req.params;
    const tracking = await prisma.tracking.findUnique({
        where: { order_id },
    });

    tracking ? res.json(tracking) : res.status(404).json({ error: "Tracking not found" });
});

/**
 * CREATE tracking for an order
 */
app.post("/tracking", async (req, res) => {
    const { order_id, latitude, longitude, tracking_status } = req.body;

    try {
        const tracking = await prisma.tracking.create({
            data: { order_id, latitude, longitude, tracking_status },
        });

        res.status(201).json(tracking);
    } catch (error) {
        res.status(400).json({ error: "Error creating tracking. Ensure order_id exists." });
    }
});

/**
 * UPDATE tracking status and location
 */
app.put("/tracking/:order_id", async (req, res) => {
    const { order_id } = req.params;
    const { latitude, longitude, tracking_status } = req.body;

    try {
        const tracking = await prisma.tracking.update({
            where: { order_id },
            data: { latitude, longitude, tracking_status },
        });

        res.json(tracking);
    } catch (error) {
        res.status(404).json({ error: "Tracking not found" });
    }
});

app.delete("/tracking/:order_id", async (req, res) => {
    const { order_id } = req.params;
    try {
        await prisma.tracking.delete({ where: { order_id } });
        res.json({ message: "Tracking deleted" });
    } catch (error) {
        res.status(404).json({ error: "Tracking not found" });
    }
});

app.listen(3004, () => {
    console.log("Server is running on http://localhost:3004");
    console.log("Swagger docs available at http://localhost:3004/docs");
});
