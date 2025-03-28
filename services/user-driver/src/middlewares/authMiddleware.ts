// user-driver-service/src/middlewares/authMiddleware.ts

import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';
import axios from 'axios';

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:5001';

interface DecodedToken {
  id: string;
  email: string;
  role?: string;
  iat: number;
  exp: number;
}

/**
 * middleware สำหรับตรวจสอบ JWT token และเพิ่มข้อมูลผู้ใช้ลงใน request
 */
export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  try {
    // ดึง token จาก header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Authorization token is required',
      });
      return;
    }

    const token = authHeader.split(' ')[1];

    // ตรวจสอบ token โดยใช้ JWT_SECRET เดียวกับ Auth Service
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-secret-key',
    ) as DecodedToken;

    // เพิ่มข้อมูลผู้ใช้ลงใน request
    (req as any).user = {
      userId: decoded.id,
      email: decoded.email,
      role: decoded.role || 'customer',
    };

    // ไปยัง middleware หรือ controller ถัดไป
    next();
  } catch (error: any) {
    logger.error('Auth middleware error', error);

    if (error.name === 'TokenExpiredError') {
      res.status(401).json({
        success: false,
        message: 'Token has expired',
      });
      return;
    }

    if (error.name === 'JsonWebTokenError') {
      res.status(401).json({
        success: false,
        message: 'Invalid token',
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Authentication error',
    });
  }
};

/**
 * middleware สำหรับตรวจสอบบทบาทของผู้ใช้
 */
export const roleMiddleware = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // ตรวจสอบว่ามีข้อมูลผู้ใช้หรือไม่ (authMiddleware ต้องทำงานก่อน)
      const user = (req as any).user;

      if (!user) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      // ตรวจสอบบทบาท
      if (!roles.includes(user.role)) {
        res.status(403).json({
          success: false,
          message: 'Access denied',
        });
        return;
      }

      // ไปยัง middleware หรือ controller ถัดไป
      next();
    } catch (error) {
      logger.error('Role middleware error', error);
      res.status(500).json({
        success: false,
        message: 'Authorization error',
      });
    }
  };
};

/**
 * ฟังก์ชั่นสำหรับเรียกข้อมูลผู้ใช้จาก Auth Service
 */
export const getUserFromAuthService = async (userId: string): Promise<any> => {
  try {
    // ใช้ SERVICE_TOKEN ที่กำหนดใน .env สำหรับการสื่อสารระหว่าง service
    const token = process.env.SERVICE_TOKEN;
    
    if (!token) {
      logger.error('SERVICE_TOKEN is not defined in environment variables');
      throw new Error('Service authentication failed');
    }
    
    const response = await axios.get(`${AUTH_SERVICE_URL}/api/users/${userId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    return response.data;
  } catch (error) {
    logger.error('Error fetching user from Auth Service', error);
    // ถ้าเกิดข้อผิดพลาด ส่งค่า null กลับไป เพื่อให้ service ยังทำงานต่อได้
    return null;
  }
};