import { Request, Response, NextFunction } from 'express';
import * as driverService from '../services/driverService';
import { formatResponse } from '../utils/responseFormatter';
import logger from '../utils/logger';
import { DriverStatus } from '@prisma/client';

/**
 * Register a new driver
 */
export const registerDriver = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  try {
    const driverData = req.body;
    const newDriver = await driverService.createDriver(driverData);
    return formatResponse(res, 201, 'Driver registered successfully', newDriver);
  } catch (error) {
    logger.error(`Error registering driver: ${error instanceof Error ? error.message : 'Unknown error'}`);
    next(error);
  }
};

/**
 * Login a driver
 */
export const loginDriver = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  try {
    const { phoneNumber, password } = req.body;
    const loginResult = await driverService.loginDriver(phoneNumber, password);
    return formatResponse(res, 200, 'Login successful', loginResult);
  } catch (error) {
    logger.error(`Error logging in driver: ${error instanceof Error ? error.message : 'Unknown error'}`);
    next(error);
  }
};

/**
 * Get all drivers with optional filtering
 */
export const getAllDrivers = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  try {
    const filters = req.query;
    const drivers = await driverService.findAllDrivers(filters);
    return formatResponse(res, 200, 'Drivers retrieved successfully', drivers);
  } catch (error) {
    logger.error(`Error retrieving drivers: ${error instanceof Error ? error.message : 'Unknown error'}`);
    next(error);
  }
};

/**
 * Get available drivers
 */
export const getAvailableDrivers = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  try {
    const availableDrivers = await driverService.findAvailableDrivers();
    return formatResponse(res, 200, 'Available drivers retrieved successfully', availableDrivers);
  } catch (error) {
    logger.error(`Error retrieving available drivers: ${error instanceof Error ? error.message : 'Unknown error'}`);
    next(error);
  }
};

/**
 * Get driver by ID
 */
export const getDriverById = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  try {
    const { id } = req.params;
    const driver = await driverService.findDriverById(id);
    
    if (!driver) {
      return formatResponse(res, 404, 'Driver not found', null);
    }
    
    return formatResponse(res, 200, 'Driver retrieved successfully', driver);
  } catch (error) {
    logger.error(`Error retrieving driver by id: ${error instanceof Error ? error.message : 'Unknown error'}`);
    next(error);
  }
};

/**
 * Update driver information
 */
export const updateDriver = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  try {
    const { id } = req.params;
    const driverData = req.body;
    const updatedDriver = await driverService.updateDriver(id, driverData);
    
    if (!updatedDriver) {
      return formatResponse(res, 404, 'Driver not found', null);
    }
    
    return formatResponse(res, 200, 'Driver updated successfully', updatedDriver);
  } catch (error) {
    logger.error(`Error updating driver: ${error instanceof Error ? error.message : 'Unknown error'}`);
    next(error);
  }
};

/**
 * Delete a driver
 */
export const deleteDriver = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  try {
    const { id } = req.params;
    const result = await driverService.deleteDriver(id);
    
    if (!result) {
      return formatResponse(res, 404, 'Driver not found', null);
    }
    
    return formatResponse(res, 200, 'Driver deleted successfully', null);
  } catch (error) {
    logger.error(`Error deleting driver: ${error instanceof Error ? error.message : 'Unknown error'}`);
    next(error);
  }
};

/**
 * Update driver status (ACTIVE, INACTIVE, SUSPENDED, BLOCKED)
 */
export const updateDriverStatus = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  try {
    const { id } = req.params;
    const { status } = req.body as { status: DriverStatus };
    
    const updatedDriver = await driverService.updateDriverStatus(id, status);
    
    if (!updatedDriver) {
      return formatResponse(res, 404, 'Driver not found', null);
    }
    
    return formatResponse(res, 200, 'Driver status updated successfully', updatedDriver);
  } catch (error) {
    logger.error(`Error updating driver status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    next(error);
  }
};

/**
 * Update driver location
 */
export const updateDriverLocation = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  try {
    const { id } = req.params;
    const { latitude, longitude, currentLocation } = req.body;
    
    const updatedDriver = await driverService.updateDriverLocation(id, latitude, longitude, currentLocation);
    
    if (!updatedDriver) {
      return formatResponse(res, 404, 'Driver not found', null);
    }
    
    return formatResponse(res, 200, 'Driver location updated successfully', updatedDriver);
  } catch (error) {
    logger.error(`Error updating driver location: ${error instanceof Error ? error.message : 'Unknown error'}`);
    next(error);
  }
};

/**
 * Update driver availability status
 */
export const updateDriverAvailability = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  try {
    const { id } = req.params;
    const { isAvailable } = req.body as { isAvailable: boolean };
    
    const updatedDriver = await driverService.updateDriverAvailability(id, isAvailable);
    
    if (!updatedDriver) {
      return formatResponse(res, 404, 'Driver not found', null);
    }
    
    return formatResponse(res, 200, 'Driver availability updated successfully', updatedDriver);
  } catch (error) {
    logger.error(`Error updating driver availability: ${error instanceof Error ? error.message : 'Unknown error'}`);
    next(error);
  }
};

/**
 * Get nearby drivers based on location and radius
 */
export const getNearbyDrivers = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  try {
    const { latitude, longitude, radius } = req.params;
    
    const nearbyDrivers = await driverService.findNearbyDrivers(
      parseFloat(latitude), 
      parseFloat(longitude), 
      parseFloat(radius)
    );
    
    return formatResponse(res, 200, 'Nearby drivers retrieved successfully', nearbyDrivers);
  } catch (error) {
    logger.error(`Error finding nearby drivers: ${error instanceof Error ? error.message : 'Unknown error'}`);
    next(error);
  }
};