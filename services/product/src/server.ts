require("dotenv").config();
import express from "express";
const cors = require("cors");
const { PrismaClient } = require("@prisma/client");
const swaggerUi = require("swagger-ui-express");
const swaggerDocument = require("../swagger.json");

const prisma = new PrismaClient();
const app = express();
app.use(express.json());
app.use(cors());

// Swagger setup
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Middleware for CORS
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

/**
 * CRUD for Products
 */

// GET all products
app.get("/products", async (req, res) => {
  try {
    const products = await prisma.product.findMany();
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// GET a single product by ID
app.get("/products/:id", async (req, res) => {
  const { id } = req.params;
  const productId = parseInt(id, 10); 
  try {
    const product = await prisma.product.findUnique({
      where: { product_id: productId },
    });
    product ? res.json(product) : res.status(404).json({ error: "Product not found" });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch product" });
  }
});

// CREATE a new product
app.post("/products", async (req, res) => {
  const { name, description, price, stock, image_url } = req.body;
  try {
    const newProduct = await prisma.product.create({
      data: { name, description, price, stock, image_url },
    });
    res.status(201).json(newProduct);
  } catch (error) {
    res.status(400).json({ error: "Error creating product" });
  }
});

// UPDATE an existing product
app.put("/products/:id", async (req, res) => {
  const { id } = req.params;
  const ProductId = parseInt(id, 10); 
  const { name, description, price, stock, image_url } = req.body;
  try {
    const updatedProduct = await prisma.product.update({
      where: { product_id: ProductId },
      data: { name, description, price, stock, image_url },
    });
    res.json(updatedProduct);
  } catch (error) {
    res.status(404).json({ error: "Product not found or invalid data" });
  }
});

// DELETE a product
app.delete("/products/:id", async (req, res) => {
  const { id } = req.params;
  const productId = parseInt(id, 10);
  try {
    await prisma.product.delete({
      where: { product_id: productId },
    });
    res.json({ message: "Product deleted" });
  } catch (error) {
    res.status(404).json({ error: "Product not found" });
  }
});

// Start the server
app.listen(3005, () => {
  console.log("Server is running on http://localhost:3005");
  console.log("Swagger docs available at http://localhost:3005/docs");
});
