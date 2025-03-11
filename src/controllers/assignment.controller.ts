import { Request, Response, NextFunction } from 'express';
import * as assignmentService from '../services/assignment.service';
import logger from '../utils/logger.util';
import { AssignmentStatusUpdateRequest } from '../types';

export const getAllAssignments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const assignments = await assignmentService.getAllAssignments();
    res.status(200).json(assignments);
  } catch (error) {
    logger.error(`Error getting all assignments: ${(error as Error).message}`);
    next(error);
  }
};

export const getAssignmentById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const assignment = await assignmentService.getAssignmentById(id);
    
    if (!assignment) {
      res.status(404).json({ message: 'Assignment not found' });
      return;
    }
    
    res.status(200).json(assignment);
  } catch (error) {
    logger.error(`Error getting assignment by id: ${(error as Error).message}`);
    next(error);
  }
};

export const createAssignment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { driverId, vehicleId } = req.body;
    
    // Check if driver and vehicle exist and are available
    const assignmentResult = await assignmentService.createAssignment(driverId, vehicleId);
    
    res.status(201).json(assignmentResult);
  } catch (error) {
    logger.error(`Error creating assignment: ${(error as Error).message}`);
    
    if ((error as Error).message.includes('not found') || 
        (error as Error).message.includes('not available')) {
      res.status(400).json({ message: (error as Error).message });
      return;
    }
    
    next(error);
  }
};

export const updateAssignmentStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body as AssignmentStatusUpdateRequest;
    
    if (!status) {
      res.status(400).json({ message: 'Status is required' });
      return;
    }
    
    const updatedAssignment = await assignmentService.updateAssignmentStatus(id, status);
    
    if (!updatedAssignment) {
      res.status(404).json({ message: 'Assignment not found' });
      return;
    }
    
    res.status(200).json(updatedAssignment);
  } catch (error) {
    logger.error(`Error updating assignment status: ${(error as Error).message}`);
    next(error);
  }
};

export const getAssignmentsByDriver = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { driverId } = req.params;
    const assignments = await assignmentService.getAssignmentsByDriver(driverId);
    res.status(200).json(assignments);
  } catch (error) {
    logger.error(`Error getting assignments by driver: ${(error as Error).message}`);
    next(error);
  }
};

export const getAssignmentsByVehicle = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { vehicleId } = req.params;
    const assignments = await assignmentService.getAssignmentsByVehicle(vehicleId);
    res.status(200).json(assignments);
  } catch (error) {
    logger.error(`Error getting assignments by vehicle: ${(error as Error).message}`);
    next(error);
  }
};

export const deleteAssignment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const deleted = await assignmentService.deleteAssignment(id);
    
    if (!deleted) {
      res.status(404).json({ message: 'Assignment not found' });
      return;
    }
    
    res.status(204).send();
  } catch (error) {
    logger.error(`Error deleting assignment: ${(error as Error).message}`);
    next(error);
  }
};