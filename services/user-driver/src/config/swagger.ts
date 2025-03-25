// user-driver-service/src/config/swagger.ts

import { Application } from 'express';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'User & Driver Service API',
      version: '1.0.0',
      description: 'API documentation for User & Driver Service',
    },
    servers: [
      {
        url: process.env.API_BASE_URL || 'http://localhost:3001/api',
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
  apis: ['./src/routes/*.ts'],
};

export const setupSwagger = (app: Application): void => {
  const specs = swaggerJsdoc(options);
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
};
