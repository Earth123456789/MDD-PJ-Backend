import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '.prisma/client';

const prisma = new PrismaClient();

interface JwtPayload {
  id: string;
  phoneNumber: string;
}

/**
 * Authenticate middleware
 * Verifies JWT token and attaches driver data to request
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  try {
    // Get token from authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret') as JwtPayload;
    
    // Find driver by id from token
    const driver = await prisma.driver.findUnique({
      where: { id: decoded.id }
    });
    
    if (!driver) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token, driver not found'
      });
    }
    
    // Attach driver to request object
    req.driver = driver;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Authentication error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Admin authorization middleware
 * Ensures the authenticated driver has admin privileges
 */
export const authorizeAdmin = (req: Request, res: Response, next: NextFunction): Response | void => {
  if (!req.driver || (req.driver as any).role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required'
    });
  }
  
  next();
};