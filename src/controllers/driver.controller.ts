import { Request, Response, NextFunction } from 'express';
import * as driverService from '../services/driver.service';
import logger from '../utils/logger.util';
import { DriverStatusUpdateRequest, LocationUpdateRequest } from '../types';

export const getAllDrivers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const drivers = await driverService.getAllDrivers();
    res.status(200).json(drivers);
  } catch (error) {
    logger.error(`Error getting all drivers: ${(error as Error).message}`);
    next(error);
  }
};

export const getDriverById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const driver = await driverService.getDriverById(id);
    
    if (!driver) {
      res.status(404).json({ message: 'Driver not found' });
      return;
    }
    
    res.status(200).json(driver);
  } catch (error) {
    logger.error(`Error getting driver by id: ${(error as Error).message}`);
    next(error);
  }
};

export const createDriver = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const driverData = req.body;
    const newDriver = await driverService.createDriver(driverData);
    res.status(201).json(newDriver);
  } catch (error) {
    logger.error(`Error creating driver: ${(error as Error).message}`);
    next(error);
  }
};

export const updateDriver = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const driverData = req.body;
    const updatedDriver = await driverService.updateDriver(id, driverData);
    
    if (!updatedDriver) {
      res.status(404).json({ message: 'Driver not found' });
      return;
    }
    
    res.status(200).json(updatedDriver);
  } catch (error) {
    logger.error(`Error updating driver: ${(error as Error).message}`);
    next(error);
  }
};

export const deleteDriver = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const deleted = await driverService.deleteDriver(id);
    
    if (!deleted) {
      res.status(404).json({ message: 'Driver not found' });
      return;
    }
    
    res.status(204).send();
  } catch (error) {
    logger.error(`Error deleting driver: ${(error as Error).message}`);
    next(error);
  }
};

export const getDriverLocation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const location = await driverService.getDriverLocation(id);
    
    if (!location) {
      res.status(404).json({ message: 'Driver or location not found' });
      return;
    }
    
    res.status(200).json(location);
  } catch (error) {
    logger.error(`Error getting driver location: ${(error as Error).message}`);
    next(error);
  }
};

export const updateDriverLocation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { latitude, longitude } = req.body as LocationUpdateRequest;
    
    if (!latitude || !longitude) {
      res.status(400).json({ message: 'Latitude and longitude are required' });
      return;
    }
    
    const updatedLocation = await driverService.updateDriverLocation(id, latitude, longitude);
    
    if (!updatedLocation) {
      res.status(404).json({ message: 'Driver not found' });
      return;
    }
    
    res.status(200).json(updatedLocation);
  } catch (error) {
    logger.error(`Error updating driver location: ${(error as Error).message}`);
    next(error);
  }
};

export const updateDriverStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body as DriverStatusUpdateRequest;
    
    if (!status) {
      res.status(400).json({ message: 'Status is required' });
      return;
    }
    
    const updatedDriver = await driverService.updateDriverStatus(id, status);
    
    if (!updatedDriver) {
      res.status(404).json({ message: 'Driver not found' });
      return;
    }
    
    res.status(200).json(updatedDriver);
  } catch (error) {
    logger.error(`Error updating driver status: ${(error as Error).message}`);
    next(error);
  }
};