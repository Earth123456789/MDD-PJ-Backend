import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { setupSwagger } from "./config/swagger";
import { connectRabbitMQ, closeRabbitMQConnection } from "./config/rabbitmq";
import authRoutes from "./routes/auth.routes";
import { logger } from "./utils/logger";


dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined in .env");
}

const app = express();
const port = process.env.PORT || 5001;


// Middleware
app.use(cors());
app.use(express.json());

// Setup Swagger
setupSwagger(app);

// API Routes
app.use("/api/auth", authRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", service: "auth-service" });
});

// Start server
const server = app.listen(port, async () => {
  logger.info(`Auth Service running on port ${port}`);

  if (process.env.ENABLE_RABBITMQ === "true") {
    try {
      await connectRabbitMQ();
      logger.info("RabbitMQ connected successfully");
    } catch (error) {
      logger.error("Failed to connect to RabbitMQ:", error);
      logger.warn("Continuing without RabbitMQ support");
    }
  } else {
    logger.info("RabbitMQ support is disabled");
  }
});

// Graceful shutdown
const shutdown = async () => {
  logger.info("Shutting down server...");

  await closeRabbitMQConnection();

  server.close(() => {
    logger.info("Server closed");
    process.exit(0);
  });

  setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10000);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
