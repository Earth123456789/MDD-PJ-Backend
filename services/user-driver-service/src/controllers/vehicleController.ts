// user-driver-service/src/controllers/vehicleController.ts

import { Request, Response } from 'express';
import { VehicleService } from '../services/vehicleService';
import { logger } from '../utils/logger';

const vehicleService = new VehicleService();

export class VehicleController {
  /**
   * สร้างข้อมูลรถใหม่
   * @route POST /api/vehicles
   */
  public async createVehicle(req: Request, res: Response): Promise<void> {
    try {
      const {
        driver_id,
        vehicle_type,
        max_weight_kg,
        max_volume_m3,
        length_m,
        width_m,
        height_m,
        status
      } = req.body;

      // ตรวจสอบข้อมูลที่จำเป็น
      if (
        !driver_id ||
        !vehicle_type ||
        !max_weight_kg ||
        !max_volume_m3 ||
        !length_m ||
        !width_m ||
        !height_m
      ) {
        res.status(400).json({
          success: false,
          message: 'Missing required fields'
        });
        return;
      }

      // ตรวจสอบประเภทรถ
      const validTypes = ['motorcycle', 'car', 'pickup', 'truck'];
      if (!validTypes.includes(vehicle_type)) {
        res.status(400).json({
          success: false,
          message: `Invalid vehicle type. Must be one of: ${validTypes.join(', ')}`
        });
        return;
      }

      // สร้างข้อมูลรถใหม่ โดยแปลง driver_id เป็น number
      const newVehicle = await vehicleService.createVehicle({
        driver_id: parseInt(driver_id),
        vehicle_type,
        max_weight_kg,
        max_volume_m3,
        length_m,
        width_m,
        height_m,
        status
      });

      res.status(201).json({
        success: true,
        data: newVehicle
      });
    } catch (error: any) {
      logger.error('Error creating vehicle', error);

      if (error.message === 'Driver not found') {
        res.status(404).json({
          success: false,
          message: 'Driver not found'
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'An error occurred while creating vehicle'
      });
    }
  }

  /**
   * ดึงข้อมูลรถตาม ID
   * @route GET /api/vehicles/:id
   */
  public async getVehicleById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // ดึงข้อมูลรถ โดยแปลง id เป็น number
      const vehicle = await vehicleService.getVehicleById(parseInt(id));

      if (!vehicle) {
        res.status(404).json({
          success: false,
          message: 'Vehicle not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: vehicle
      });
    } catch (error) {
      logger.error('Error fetching vehicle by ID', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred while fetching vehicle data'
      });
    }
  }

  /**
   * ดึงข้อมูลรถตาม driver_id
   * @route GET /api/vehicles/driver/:driverId
   */
  public async getVehiclesByDriverId(req: Request, res: Response): Promise<void> {
    try {
      const { driverId } = req.params;

      // ดึงข้อมูลรถ โดยแปลง driverId เป็น number
      const vehicles = await vehicleService.getVehiclesByDriverId(parseInt(driverId));

      res.status(200).json({
        success: true,
        data: vehicles
      });
    } catch (error) {
      logger.error('Error fetching vehicles by driver ID', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred while fetching vehicle data'
      });
    }
  }

  /**
   * อัพเดทสถานะรถ
   * @route PATCH /api/vehicles/:id/status
   */
  public async updateVehicleStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;

      // ตรวจสอบสถานะ
      const validStatuses = ['available', 'busy', 'offline'];
      if (!status || !validStatuses.includes(status)) {
        res.status(400).json({
          success: false,
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
        });
        return;
      }

      // อัพเดทสถานะ โดยแปลง id เป็น number
      const updatedVehicle = await vehicleService.updateVehicleStatus(parseInt(id), status);

      res.status(200).json({
        success: true,
        data: updatedVehicle
      });
    } catch (error: any) {
      logger.error('Error updating vehicle status', error);

      if (error.message === 'Vehicle not found') {
        res.status(404).json({
          success: false,
          message: 'Vehicle not found'
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'An error occurred while updating vehicle status'
      });
    }
  }

  /**
   * อัพเดทข้อมูลรถ
   * @route PATCH /api/vehicles/:id
   */
  public async updateVehicle(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const {
        vehicle_type,
        max_weight_kg,
        max_volume_m3,
        length_m,
        width_m,
        height_m,
        status
      } = req.body;

      // ตรวจสอบว่ามีข้อมูลที่จะอัพเดทหรือไม่
      if (
        !vehicle_type &&
        max_weight_kg === undefined &&
        max_volume_m3 === undefined &&
        length_m === undefined &&
        width_m === undefined &&
        height_m === undefined &&
        !status
      ) {
        res.status(400).json({
          success: false,
          message: 'No data to update'
        });
        return;
      }

      // ตรวจสอบประเภทรถถ้ามีการระบุ
      if (vehicle_type) {
        const validTypes = ['motorcycle', 'car', 'pickup', 'truck'];
        if (!validTypes.includes(vehicle_type)) {
          res.status(400).json({
            success: false,
            message: `Invalid vehicle type. Must be one of: ${validTypes.join(', ')}`
          });
          return;
        }
      }

      // ตรวจสอบสถานะถ้ามีการระบุ
      if (status) {
        const validStatuses = ['available', 'busy', 'offline'];
        if (!validStatuses.includes(status)) {
          res.status(400).json({
            success: false,
            message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
          });
          return;
        }
      }

      // สร้างข้อมูลสำหรับอัพเดท
      const updateData: any = {};
      if (vehicle_type) updateData.vehicle_type = vehicle_type;
      if (max_weight_kg !== undefined) updateData.max_weight_kg = max_weight_kg;
      if (max_volume_m3 !== undefined) updateData.max_volume_m3 = max_volume_m3;
      if (length_m !== undefined) updateData.length_m = length_m;
      if (width_m !== undefined) updateData.width_m = width_m;
      if (height_m !== undefined) updateData.height_m = height_m;
      if (status) updateData.status = status;

      // อัพเดทข้อมูลรถ โดยแปลง id เป็น number
      const updatedVehicle = await vehicleService.updateVehicle(parseInt(id), updateData);

      res.status(200).json({
        success: true,
        data: updatedVehicle
      });
    } catch (error: any) {
      logger.error('Error updating vehicle', error);

      if (error.message === 'Vehicle not found') {
        res.status(404).json({
          success: false,
          message: 'Vehicle not found'
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'An error occurred while updating vehicle'
      });
    }
  }

  /**
   * ลบข้อมูลรถ
   * @route DELETE /api/vehicles/:id
   */
  public async deleteVehicle(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // ลบข้อมูลรถ โดยแปลง id เป็น number
      await vehicleService.deleteVehicle(parseInt(id));

      res.status(200).json({
        success: true,
        message: 'Vehicle deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting vehicle', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred while deleting vehicle'
      });
    }
  }

  /**
   * ค้นหารถ
   * @route GET /api/vehicles
   */
  public async searchVehicles(req: Request, res: Response): Promise<void> {
    try {
      const { status, type, driver_id, page = '1', limit = '10' } = req.query;

      // ค้นหารถ โดยแปลง driver_id เป็น number (ถ้ามี)
      const result = await vehicleService.searchVehicles({
        status: status as string,
        type: type as string,
        driverId: driver_id ? parseInt(driver_id as string) : undefined,
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      });

      res.status(200).json({
        success: true,
        data: result.items,
        pagination: result.pagination
      });
    } catch (error) {
      logger.error('Error searching vehicles', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred while searching vehicles'
      });
    }
  }

  /**
   * ค้นหารถที่มีความสามารถในการบรรทุกตามที่ต้องการ
   * @route GET /api/vehicles/capacity
   */
  public async findVehiclesByCapacity(req: Request, res: Response): Promise<void> {
    try {
      const {
        weight_kg,
        volume_m3,
        length_m,
        width_m,
        height_m
      } = req.query;

      // ตรวจสอบข้อมูลที่จำเป็น
      if (!weight_kg) {
        res.status(400).json({
          success: false,
          message: 'Weight is required'
        });
        return;
      }

      // สร้างข้อมูลสำหรับค้นหา
      const requirements: any = {
        weight_kg: parseFloat(weight_kg as string)
      };

      if (volume_m3) {
        requirements.volume_m3 = parseFloat(volume_m3 as string);
      }

      if (length_m && width_m && height_m) {
        requirements.dimensions = {
          length_m: parseFloat(length_m as string),
          width_m: parseFloat(width_m as string),
          height_m: parseFloat(height_m as string)
        };
      }

      // ค้นหารถ
      const vehicles = await vehicleService.findAvailableVehiclesByCapacity(requirements);

      res.status(200).json({
        success: true,
        data: vehicles
      });
    } catch (error) {
      logger.error('Error finding vehicles by capacity', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred while finding vehicles by capacity'
      });
    }
  }
}