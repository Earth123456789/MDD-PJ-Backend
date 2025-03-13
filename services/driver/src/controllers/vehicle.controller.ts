import { Request, Response, NextFunction } from "express";
import * as vehicleService from "../services/vehicle.service";
import logger from "../utils/logger.util";
import { VehicleStatusUpdateRequest, LocationUpdateRequest } from "../types";

// Utility function to convert string to number
const parseId = (id: string): number | null => {
  const parsedId = parseInt(id, 10);
  return isNaN(parsedId) ? null : parsedId;
};

export const getAllVehicles = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const vehicles = await vehicleService.getAllVehicles();
    res.status(200).json(vehicles);
  } catch (error) {
    logger.error(`Error getting all vehicles: ${(error as Error).message}`);
    next(error);
  }
};

export const getVehicleById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const vehicleId = parseId(id);

    if (!vehicleId) {
      res.status(400).json({ message: "Invalid vehicle ID" });
      return;
    }

    const vehicle = await vehicleService.getVehicleById(vehicleId);

    if (!vehicle) {
      res.status(404).json({ message: "Vehicle not found" });
      return;
    }

    res.status(200).json(vehicle);
  } catch (error) {
    logger.error(`Error getting vehicle by id: ${(error as Error).message}`);
    next(error);
  }
};

export const createVehicle = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const vehicleData = req.body;

    // Add basic validation for required fields if necessary
    if (!vehicleData.name || !vehicleData.type) {
      res.status(400).json({ message: "Vehicle name and type are required" });
      return;
    }

    const newVehicle = await vehicleService.createVehicle(vehicleData);
    res.status(201).json(newVehicle);
  } catch (error) {
    logger.error(`Error creating vehicle: ${(error as Error).message}`);
    next(error);
  }
};

export const updateVehicle = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const vehicleId = parseId(id);

    if (!vehicleId) {
      res.status(400).json({ message: "Invalid vehicle ID" });
      return;
    }

    const vehicleData = req.body;
    const updatedVehicle = await vehicleService.updateVehicle(vehicleId, vehicleData);

    if (!updatedVehicle) {
      res.status(404).json({ message: "Vehicle not found" });
      return;
    }

    res.status(200).json(updatedVehicle);
  } catch (error) {
    logger.error(`Error updating vehicle: ${(error as Error).message}`);
    next(error);
  }
};

export const deleteVehicle = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const vehicleId = parseId(id);

    if (!vehicleId) {
      res.status(400).json({ message: "Invalid vehicle ID" });
      return;
    }

    const deleted = await vehicleService.deleteVehicle(vehicleId);

    if (!deleted) {
      res.status(404).json({ message: "Vehicle not found" });
      return;
    }

    res.status(204).send();
  } catch (error) {
    logger.error(`Error deleting vehicle: ${(error as Error).message}`);
    next(error);
  }
};

export const getVehicleLocation = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const vehicleId = parseId(id);

    if (!vehicleId) {
      res.status(400).json({ message: "Invalid vehicle ID" });
      return;
    }

    const location = await vehicleService.getVehicleLocation(vehicleId);

    if (!location) {
      res.status(404).json({ message: "Vehicle or location not found" });
      return;
    }

    res.status(200).json(location);
  } catch (error) {
    logger.error(`Error getting vehicle location: ${(error as Error).message}`);
    next(error);
  }
};

export const updateVehicleLocation = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { latitude, longitude } = req.body as LocationUpdateRequest;

    if (!latitude || !longitude) {
      res.status(400).json({ message: "Latitude and longitude are required" });
      return;
    }

    const vehicleId = parseId(id);

    if (!vehicleId) {
      res.status(400).json({ message: "Invalid vehicle ID" });
      return;
    }

    const updatedLocation = await vehicleService.updateVehicleLocation(
      vehicleId,
      latitude,
      longitude,
    );

    if (!updatedLocation) {
      res.status(404).json({ message: "Vehicle not found" });
      return;
    }

    res.status(200).json(updatedLocation);
  } catch (error) {
    logger.error(
      `Error updating vehicle location: ${(error as Error).message}`,
    );
    next(error);
  }
};

export const updateVehicleStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body as VehicleStatusUpdateRequest;

    if (!status) {
      res.status(400).json({ message: "Status is required" });
      return;
    }

    const vehicleId = parseId(id);

    if (!vehicleId) {
      res.status(400).json({ message: "Invalid vehicle ID" });
      return;
    }

    const updatedVehicle = await vehicleService.updateVehicleStatus(
      vehicleId,
      status,
    );

    if (!updatedVehicle) {
      res.status(404).json({ message: "Vehicle not found" });
      return;
    }

    res.status(200).json(updatedVehicle);
  } catch (error) {
    logger.error(`Error updating vehicle status: ${(error as Error).message}`);
    next(error);
  }
};
