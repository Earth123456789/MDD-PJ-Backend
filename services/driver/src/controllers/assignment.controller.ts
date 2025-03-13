import { Request, Response, NextFunction } from "express";
import * as assignmentService from "../services/assignment.service";
import logger from "../utils/logger.util";
import { AssignmentStatusUpdateRequest } from "../types";

const parseId = (id: string): number | null => {
  const parsedId = parseInt(id, 10);
  return isNaN(parsedId) ? null : parsedId;
};

export const getAllAssignments = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const assignments = await assignmentService.getAllAssignments();
    res.status(200).json(assignments);
  } catch (error) {
    logger.error(`Error getting all assignments: ${(error as Error).message}`);
    next(error);
  }
};

export const getAssignmentById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const assignmentId = parseId(id);

    if (!assignmentId) {
      res.status(400).json({ message: "Invalid assignment ID" });
      return;
    }

    const assignment = await assignmentService.getAssignmentById(assignmentId);

    if (!assignment) {
      res.status(404).json({ message: "Assignment not found" });
      return;
    }

    res.status(200).json(assignment);
  } catch (error) {
    logger.error(`Error getting assignment by id: ${(error as Error).message}`);
    next(error);
  }
};

export const createAssignment = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { driverId, vehicleId } = req.body;

    if (!driverId || !vehicleId) {
      res.status(400).json({ message: "Driver ID and Vehicle ID are required" });
      return;
    }

    const assignmentResult = await assignmentService.createAssignment(
      driverId,
      vehicleId,
    );

    res.status(201).json(assignmentResult);
  } catch (error) {
    logger.error(`Error creating assignment: ${(error as Error).message}`);

    if (
      (error as Error).message.includes("not found") ||
      (error as Error).message.includes("not available")
    ) {
      res.status(400).json({ message: (error as Error).message });
      return;
    }

    next(error);
  }
};

export const updateAssignmentStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body as AssignmentStatusUpdateRequest;

    if (!status) {
      res.status(400).json({ message: "Status is required" });
      return;
    }

    const assignmentId = parseId(id);

    if (!assignmentId) {
      res.status(400).json({ message: "Invalid assignment ID" });
      return;
    }

    const updatedAssignment = await assignmentService.updateAssignmentStatus(
      assignmentId,
      status,
    );

    if (!updatedAssignment) {
      res.status(404).json({ message: "Assignment not found" });
      return;
    }

    res.status(200).json(updatedAssignment);
  } catch (error) {
    logger.error(
      `Error updating assignment status: ${(error as Error).message}`,
    );
    next(error);
  }
};

export const getAssignmentsByDriver = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { driverId } = req.params;
    const driverIdAsNumber = Number(driverId); // Convert string to number
    if (isNaN(driverIdAsNumber)) {
      res.status(400).json({ message: "Invalid driver ID" });
      return;
    }
    const assignments = await assignmentService.getAssignmentsByDriver(driverIdAsNumber);
    res.status(200).json(assignments);
  } catch (error) {
    logger.error(
      `Error getting assignments by driver: ${(error as Error).message}`,
    );
    next(error);
  }
};

export const getAssignmentsByVehicle = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { vehicleId } = req.params;
    const vehicleIdAsNumber = Number(vehicleId); 
    if (isNaN(vehicleIdAsNumber)) {
      res.status(400).json({ message: "Invalid vehicle ID" });
      return;
    }
    const assignments = await assignmentService.getAssignmentsByVehicle(vehicleIdAsNumber);
    res.status(200).json(assignments);
  } catch (error) {
    logger.error(
      `Error getting assignments by vehicle: ${(error as Error).message}`,
    );
    next(error);
  }
};

export const deleteAssignment = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const assignmentId = parseId(id);

    if (!assignmentId) {
      res.status(400).json({ message: "Invalid assignment ID" });
      return;
    }

    const deleted = await assignmentService.deleteAssignment(assignmentId);

    if (!deleted) {
      res.status(404).json({ message: "Assignment not found" });
      return;
    }

    res.status(204).send();
  } catch (error) {
    logger.error(`Error deleting assignment: ${(error as Error).message}`);
    next(error);
  }
};
