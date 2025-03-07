import { Driver } from '.prisma/client';
import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      driver?: Driver;
    }
  }
}