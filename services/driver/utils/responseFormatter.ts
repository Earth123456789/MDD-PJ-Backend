import { Response } from 'express';

/**
 * Format API response
 * @param res - Express response object
 * @param statusCode - HTTP status code
 * @param message - Response message
 * @param data - Response data
 * @param meta - Additional metadata
 * @returns Formatted response
 */
export const formatResponse = <T>(
  res: Response, 
  statusCode: number, 
  message: string, 
  data: T | null = null, 
  meta: Record<string, any> = {}
): Response => {
  const success = statusCode >= 200 && statusCode < 300;
  
  return res.status(statusCode).json({
    success,
    message,
    data,
    ...meta,
    timestamp: new Date().toISOString()
  });
};