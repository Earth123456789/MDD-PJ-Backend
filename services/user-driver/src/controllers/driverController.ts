// user-driver-service/src/controllers/driverController.ts

import { Request, Response } from 'express';
import { DriverService } from '../services/driverService';
import { logger } from '../utils/logger';

const driverService = new DriverService();

export class DriverController {
  /**
   * ลงทะเบียนคนขับใหม่
   * @route POST /api/drivers/register
   */
  public async registerDriver(req: Request, res: Response): Promise<void> {
    try {
      const {
        email,
        password,
        full_name,
        phone,
        license_number,
        id_card_number,
      } = req.body;

      // ตรวจสอบข้อมูลที่จำเป็น
      if (!email || !password || !full_name || !phone || !license_number || !id_card_number) {
        res.status(400).json({
          success: false,
          message: 'Missing required fields',
        });
        return;
      }

      // สร้างคนขับใหม่
      const result = await driverService.registerDriver({
        email,
        password,
        full_name,
        phone,
        license_number,
        id_card_number,
      });

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error('Error registering driver', error);

      if (error.message === 'Email already exists') {
        res.status(409).json({
          success: false,
          message: 'Email already in use',
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'An error occurred while registering driver',
      });
    }
  }

  /**
   * สร้างข้อมูลคนขับสำหรับผู้ใช้ที่มีอยู่แล้ว
   * @route POST /api/drivers
   */
  public async createDriver(req: Request, res: Response): Promise<void> {
    try {
      const { user_id, license_number, id_card_number, current_location } = req.body;

      // ตรวจสอบข้อมูลที่จำเป็น
      if (!user_id || !license_number || !id_card_number) {
        res.status(400).json({
          success: false,
          message: 'Missing required fields',
        });
        return;
      }

      // สร้างข้อมูลคนขับ
      const driver = await driverService.createDriver({
        user_id,
        license_number,
        id_card_number,
        current_location,
      });

      res.status(201).json({
        success: true,
        data: driver,
      });
    } catch (error: any) {
      logger.error('Error creating driver profile', error);

      if (error.message === 'User not found') {
        res.status(404).json({
          success: false,
          message: 'User not found',
        });
        return;
      }

      if (error.message === 'User must have driver role') {
        res.status(400).json({
          success: false,
          message: 'User must have driver role',
        });
        return;
      }

      if (error.message === 'Driver profile already exists for this user') {
        res.status(409).json({
          success: false,
          message: 'Driver profile already exists for this user',
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'An error occurred while creating driver profile',
      });
    }
  }

  /**
   * ดึงข้อมูลคนขับตาม ID
   * @route GET /api/drivers/:id
   */
  public async getDriverById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // ดึงข้อมูลคนขับพร้อมข้อมูลผู้ใช้
      const driver = await driverService.getDriverWithUserData(id);

      if (!driver) {
        res.status(404).json({
          success: false,
          message: 'Driver not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: driver,
      });
    } catch (error) {
      logger.error('Error fetching driver by ID', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred while fetching driver',
      });
    }
  }

  /**
   * ดึงข้อมูลคนขับตาม user_id
   * @route GET /api/drivers/user/:userId
   */
  public async getDriverByUserId(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      // ดึงข้อมูลคนขับ
      const driver = await driverService.getDriverByUserId(userId);

      if (!driver) {
        res.status(404).json({
          success: false,
          message: 'Driver not found for this user',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: driver,
      });
    } catch (error) {
      logger.error('Error fetching driver by user ID', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred while fetching driver',
      });
    }
  }

  /**
   * อัพเดทสถานะคนขับ
   * @route PATCH /api/drivers/:id/status
   */
  public async updateDriverStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;

      // ตรวจสอบสถานะที่ส่งมา
      const validStatuses = ['active', 'inactive', 'suspended'];
      if (!status || !validStatuses.includes(status)) {
        res.status(400).json({
          success: false,
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        });
        return;
      }

      // อัพเดทสถานะคนขับ
      const updatedDriver = await driverService.updateDriverStatus(id, status);

      res.status(200).json({
        success: true,
        data: updatedDriver,
      });
    } catch (error: any) {
      logger.error('Error updating driver status', error);

      if (error.message === 'Driver not found') {
        res.status(404).json({
          success: false,
          message: 'Driver not found',
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'An error occurred while updating driver status',
      });
    }
  }

  /**
   * อัพเดทตำแหน่งคนขับ
   * @route PATCH /api/drivers/:id/location
   */
  public async updateDriverLocation(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { latitude, longitude } = req.body;

      // ตรวจสอบข้อมูลตำแหน่ง
      if (latitude === undefined || longitude === undefined) {
        res.status(400).json({
          success: false,
          message: 'Latitude and longitude are required',
        });
        return;
      }

      // อัพเดทตำแหน่งคนขับ
      const updatedDriver = await driverService.updateDriverLocation(id, {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
      });

      res.status(200).json({
        success: true,
        data: updatedDriver,
      });
    } catch (error: any) {
      logger.error('Error updating driver location', error);

      if (error.message === 'Driver not found') {
        res.status(404).json({
          success: false,
          message: 'Driver not found',
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'An error occurred while updating driver location',
      });
    }
  }

  /**
   * อัพเดทข้อมูลคนขับ
   * @route PATCH /api/drivers/:id
   */
  public async updateDriver(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { license_number, id_card_number, current_location, status, rating } = req.body;

      // ตรวจสอบว่ามีข้อมูลที่จะอัพเดทหรือไม่
      if (!license_number && !id_card_number && !current_location && !status && rating === undefined) {
        res.status(400).json({
          success: false,
          message: 'No data to update',
        });
        return;
      }

      // ตรวจสอบสถานะถ้ามีการส่งมา
      if (status) {
        const validStatuses = ['active', 'inactive', 'suspended'];
        if (!validStatuses.includes(status)) {
          res.status(400).json({
            success: false,
            message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
          });
          return;
        }
      }

      // ตรวจสอบคะแนนถ้ามีการส่งมา
      if (rating !== undefined) {
        if (rating < 0 || rating > 5) {
          res.status(400).json({
            success: false,
            message: 'Rating must be between 0 and 5',
          });
          return;
        }
      }

      // สร้างข้อมูลสำหรับอัพเดท
      const updateData: any = {};
      if (license_number) updateData.license_number = license_number;
      if (id_card_number) updateData.id_card_number = id_card_number;
      if (current_location) updateData.current_location = current_location;
      if (status) updateData.status = status;
      if (rating !== undefined) updateData.rating = parseFloat(rating);

      // อัพเดทข้อมูลคนขับ
      const updatedDriver = await driverService.updateDriver(id, updateData);

      res.status(200).json({
        success: true,
        data: updatedDriver,
      });
    } catch (error: any) {
      logger.error('Error updating driver', error);

      if (error.message === 'Driver not found') {
        res.status(404).json({
          success: false,
          message: 'Driver not found',
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'An error occurred while updating driver',
      });
    }
  }

  /**
   * ให้คะแนนคนขับ
   * @route POST /api/drivers/:id/rate
   */
  public async rateDriver(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { rating } = req.body;

      // ตรวจสอบคะแนน
      if (rating === undefined) {
        res.status(400).json({
          success: false,
          message: 'Rating is required',
        });
        return;
      }

      const ratingValue = parseFloat(rating);

      if (isNaN(ratingValue) || ratingValue < 0 || ratingValue > 5) {
        res.status(400).json({
          success: false,
          message: 'Rating must be a number between 0 and 5',
        });
        return;
      }

      // ให้คะแนนคนขับ
      const updatedDriver = await driverService.rateDriver(id, ratingValue);

      res.status(200).json({
        success: true,
        message: 'Driver rated successfully',
        data: updatedDriver,
      });
    } catch (error: any) {
      logger.error('Error rating driver', error);

      if (error.message === 'Driver not found') {
        res.status(404).json({
          success: false,
          message: 'Driver not found',
        });
        return;
      }

      if (error.message === 'Rating must be between 0 and 5') {
        res.status(400).json({
          success: false,
          message: 'Rating must be between 0 and 5',
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'An error occurred while rating driver',
      });
    }
  }

  /**
   * ลบข้อมูลคนขับ
   * @route DELETE /api/drivers/:id
   */
  public async deleteDriver(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // ลบข้อมูลคนขับ
      await driverService.deleteDriver(id);

      res.status(200).json({
        success: true,
        message: 'Driver deleted successfully',
      });
    } catch (error) {
      logger.error('Error deleting driver', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred while deleting driver',
      });
    }
  }

  /**
   * ค้นหาคนขับ
   * @route GET /api/drivers
   */
  public async searchDrivers(req: Request, res: Response): Promise<void> {
    try {
      const { status, query, page = '1', limit = '10' } = req.query;

      // ค้นหาคนขับ
      const result = await driverService.searchDrivers({
        status: status as string,
        query: query as string,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
      });

      res.status(200).json({
        success: true,
        data: result.items,
        pagination: result.pagination,
      });
    } catch (error) {
      logger.error('Error searching drivers', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred while searching drivers',
      });
    }
  }

  /**
   * ค้นหาคนขับในบริเวณใกล้เคียง
   * @route GET /api/drivers/nearby
   */
  public async findNearbyDrivers(req: Request, res: Response): Promise<void> {
    try {
      const { latitude, longitude, radius = '5' } = req.query;

      // ตรวจสอบข้อมูลตำแหน่ง
      if (!latitude || !longitude) {
        res.status(400).json({
          success: false,
          message: 'Latitude and longitude are required',
        });
        return;
      }

      // ค้นหาคนขับในบริเวณใกล้เคียง
      const drivers = await driverService.findAvailableDriversNearby(
        {
          latitude: parseFloat(latitude as string),
          longitude: parseFloat(longitude as string),
        },
        parseFloat(radius as string),
      );

      res.status(200).json({
        success: true,
        data: drivers,
      });
    } catch (error) {
      logger.error('Error finding nearby drivers', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred while finding nearby drivers',
      });
    }
  }
}