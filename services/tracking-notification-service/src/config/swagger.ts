import { Application } from 'express';
import swaggerUi from 'swagger-ui-express';
import path from 'path';
import fs from 'fs';

export const setupSwagger = (app: Application): void => {
  try {
    // ลองโหลดจากทั้ง src และ dist
    let swaggerJsonPath;
    if (fs.existsSync(path.join(__dirname, '../../src/swagger.json'))) {
      swaggerJsonPath = path.join(__dirname, '../../src/swagger.json');
    } else if (fs.existsSync(path.join(__dirname, '../swagger.json'))) {
      swaggerJsonPath = path.join(__dirname, '../swagger.json');
    } else {
      console.log('Warning: Could not find swagger.json file');
      return;
    }

    const swaggerDocument = JSON.parse(fs.readFileSync(swaggerJsonPath, 'utf8'));
    console.log(`Swagger initialized with ${Object.keys(swaggerDocument.paths || {}).length} API paths.`);
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  } catch (error) {
    console.error('Error setting up Swagger:', error);
  }
};