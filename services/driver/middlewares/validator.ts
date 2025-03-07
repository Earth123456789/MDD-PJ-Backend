import { Request, Response, NextFunction } from 'express';
import { body, param, validationResult } from 'express-validator';

/**
 * Validate driver creation
 */
export const validateDriverCreation = [
  body('firstName')
    .notEmpty().withMessage('First name is required')
    .isString().withMessage('First name must be a string'),
    
  body('lastName')
    .notEmpty().withMessage('Last name is required')
    .isString().withMessage('Last name must be a string'),
    
  body('phoneNumber')
    .notEmpty().withMessage('Phone number is required')
    .isMobilePhone().withMessage('Invalid phone number format'),
    
  body('email')
    .optional()
    .isEmail().withMessage('Invalid email format'),
    
  body('licenseNumber')
    .notEmpty().withMessage('License number is required')
    .isString().withMessage('License number must be a string'),
    
  body('licenseExpiry')
    .notEmpty().withMessage('License expiry date is required')
    .isISO8601().withMessage('License expiry must be a valid date'),
    
  body('idCardNumber')
    .notEmpty().withMessage('ID card number is required')
    .isString().withMessage('ID card number must be a string'),
    
  body('dateOfBirth')
    .notEmpty().withMessage('Date of birth is required')
    .isISO8601().withMessage('Date of birth must be a valid date'),
    
  body('address')
    .notEmpty().withMessage('Address is required')
    .isString().withMessage('Address must be a string'),
    
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  
  // Check for validation errors
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }
    next();
  }
];

/**
 * Validate driver update
 */
export const validateDriverUpdate = [
  body('firstName')
    .optional()
    .isString().withMessage('First name must be a string'),
    
  body('lastName')
    .optional()
    .isString().withMessage('Last name must be a string'),
    
  body('phoneNumber')
    .optional()
    .isMobilePhone().withMessage('Invalid phone number format'),
    
  body('email')
    .optional()
    .isEmail().withMessage('Invalid email format'),
    
  body('licenseNumber')
    .optional()
    .isString().withMessage('License number must be a string'),
    
  body('licenseExpiry')
    .optional()
    .isISO8601().withMessage('License expiry must be a valid date'),
    
  body('idCardNumber')
    .optional()
    .isString().withMessage('ID card number must be a string'),
    
  body('dateOfBirth')
    .optional()
    .isISO8601().withMessage('Date of birth must be a valid date'),
    
  body('address')
    .optional()
    .isString().withMessage('Address must be a string'),
    
  body('password')
    .optional()
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  
  // Check for validation errors
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }
    next();
  }
];

/**
 * Validate driver ID parameter
 */
export const validateDriverId = [
  param('id')
    .notEmpty().withMessage('Driver ID is required')
    .isUUID().withMessage('Invalid driver ID format'),
  
  // Check for validation errors
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
    }
    next();
  }
];