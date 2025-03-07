import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import logger from '../utils/logger';

/**
 * Custom error with status code
 */
export class AppError extends Error {
  statusCode: number;
  
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
}

/**
 * Global error handler middleware
 */
const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction): Response => {
  logger.error(`${err.stack}`);
  
  // Handle Prisma specific errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // Handle unique constraint violation
    if (err.code === 'P2002') {
      const field = err.meta?.target as string[];
      return res.status(409).json({
        success: false,
        message: `A driver with this ${field[0]} already exists`,
        error: 'UNIQUE_CONSTRAINT_VIOLATION'
      });
    }
    
    // Handle record not found
    if (err.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Driver not found',
        error: 'RECORD_NOT_FOUND'
      });
    }
    
    // Other Prisma errors
    return res.status(400).json({
      success: false,
      message: 'Database operation failed',
      error: err.code
    });
  }
  
  // Handle custom AppError
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message
    });
  }
  
  // Handle JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Authentication error',
      error: err.message
    });
  }
  
  // Handle other errors
  const statusCode = 500;
  const message = err.message || 'Internal server error';
  
  return res.status(statusCode).json({
    success: false,
    message,
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};

export default errorHandler;