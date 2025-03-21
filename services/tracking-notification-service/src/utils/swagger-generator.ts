import swaggerJsdoc from 'swagger-jsdoc';
import fs from 'fs';
import path from 'path';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Tracking & Notification Service API',
      version: '1.0.0',
      description: 'API documentation for Tracking & Notification Service',
    },
    servers: [
      {
        url: process.env.API_BASE_URL || 'http://localhost:3002/api',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: [
    path.join(__dirname, '../../src/routes/*.ts')
  ],
};

const specs = swaggerJsdoc(options);
fs.writeFileSync(
  path.join(__dirname, '../../src/swagger.json'),
  JSON.stringify(specs, null, 2)
);

console.log('Swagger JSON file has been generated');