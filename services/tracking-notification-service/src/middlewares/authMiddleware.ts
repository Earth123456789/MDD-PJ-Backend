// tracking-notification-service/src/middlewares/authMiddleware.ts

import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

interface DecodedToken {
  userId: number;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

/**
 * middleware สำหรับตรวจสอบ JWT token และเพิ่มข้อมูลผู้ใช้ลงใน request
 */
export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // ดึง token จาก header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Authorization token is required'
      });
      return;
    }
    
    const token = authHeader.split(' ')[1];
    
    // ตรวจสอบ token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-secret-key'
    ) as DecodedToken;
    
    // เพิ่มข้อมูลผู้ใช้ลงใน request
    (req as any).user = decoded;
    
    // ไปยัง middleware หรือ controller ถัดไป
    next();
  } catch (error: any) {
    logger.error('Auth middleware error', error);
    
    if (error.name === 'TokenExpiredError') {
      res.status(401).json({
        success: false,
        message: 'Token has expired'
      });
      return;
    }
    
    if (error.name === 'JsonWebTokenError') {
      res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
      return;
    }
    
    res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
};