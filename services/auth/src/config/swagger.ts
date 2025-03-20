import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { Express } from "express";

// กำหนด Options สำหรับ Swagger
const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Auth Service API",
      version: "1.0.0",
      description: "API documentation for the Authentication Service",
    },
    servers: [
      {
        url: "http://localhost:5001",
        description: "Local server",
      },
    ],
  },
  apis: ["./src/routes/*.ts"], // กำหนดให้ Swagger โหลดจากไฟล์ route
};

// สร้าง Swagger Spec
const swaggerSpec = swaggerJsdoc(options);

// ฟังก์ชันสำหรับติดตั้ง Swagger ใน Express
export const setupSwagger = (app: Express) => {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
};
