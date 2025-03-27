import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET; // ใช้ HS256

interface DecodedToken {
  id: string;
  email: string;
  iat: number;
  exp: number;
}

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;
    
    // Log the authorization header to check if it's received properly
    logger.info('Authorization Header:', authHeader);
    logger.info('JWT_SECRET:', JWT_SECRET);

    

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.error('Authorization header missing or incorrect');
      return res
        .status(401)
        .json({ success: false, message: 'Authorization token is required' });
    }

    const token = authHeader.split(' ')[1];
    
    // Log the extracted token for verification
    logger.info('Token extracted:', token);

    // Verify the token using JWT_SECRET
    const decoded = jwt.verify(token, JWT_SECRET as string, {
      algorithms: ['HS256'],
    }) as DecodedToken;

    // Log decoded token for debugging
    logger.info('Decoded Token:', decoded);

    // Attach decoded user to request object
    (req as any).user = decoded;
    
    // Continue to the next middleware or route handler
    next();
  } catch (error: any) {
    logger.error('Auth middleware error', error);

    // Handle different JWT errors
    if (error.name === 'TokenExpiredError') {
      return res
        .status(401)
        .json({ success: false, message: 'Token has expired' });
    }

    if (error.name === 'JsonWebTokenError') {
      return res
        .status(401)
        .json({ success: false, message: 'Invalid token' });
    }

    // General error response for unexpected errors
    res.status(500).json({ success: false, message: 'Authentication error' });
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
