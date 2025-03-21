// tracking-notification-service/src/controllers/trackingController.ts

import { Request, Response } from 'express';
import { TrackingService } from '../services/trackingService';
import { logger } from '../utils/logger';

const trackingService = new TrackingService();

export class TrackingController {
  /**
   * ดึงข้อมูลการติดตามของออเดอร์
   * @route GET /api/tracking/:orderId
   */
  public async getOrderTracking(req: Request, res: Response): Promise<void> {
    try {
      const { orderId } = req.params;

      // ดึงข้อมูลการติดตาม
      const tracking = await trackingService.getOrderTracking(parseInt(orderId));

      res.status(200).json({
        success: true,
        data: tracking
      });
    } catch (error) {
      logger.error('Error fetching order tracking', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred while fetching tracking data'
      });
    }
  }

  /**
   * ดึงข้อมูลการติดตามล่าสุดของออเดอร์
   * @route GET /api/tracking/:orderId/latest
   */
  public async getLatestOrderTracking(req: Request, res: Response): Promise<void> {
    try {
      const { orderId } = req.params;

      // ดึงข้อมูลการติดตามล่าสุด
      const tracking = await trackingService.getLatestOrderTracking(parseInt(orderId));

      if (!tracking) {
        res.status(404).json({
          success: false,
          message: 'Tracking not found for this order'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: tracking
      });
    } catch (error) {
      logger.error('Error fetching latest order tracking', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred while fetching tracking data'
      });
    }
  }

  /**
   * สร้างการอัพเดทการติดตามของออเดอร์ (สำหรับใช้โดย admin หรือบริการอื่น)
   * @route POST /api/tracking/:orderId
   */
  public async createTrackingUpdate(req: Request, res: Response): Promise<void> {
    try {
      const { orderId } = req.params;
      const { status, location, description } = req.body;

      // ตรวจสอบข้อมูลที่จำเป็น
      if (!status) {
        res.status(400).json({
          success: false,
          message: 'Status is required'
        });
        return;
      }

      // สร้างการอัพเดทการติดตาม
      const newTracking = await trackingService.createTrackingUpdate({
        order_id: parseInt(orderId),
        status,
        location,
        description
      });

      res.status(201).json({
        success: true,
        data: newTracking
      });
    } catch (error) {
      logger.error('Error creating tracking update', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred while creating tracking update'
      });
    }
  }

  /**
   * อัพเดทตำแหน่งในการติดตามของออเดอร์
   * @route PATCH /api/tracking/:orderId/location
   */
  public async updateTrackingLocation(req: Request, res: Response): Promise<void> {
    try {
      const { orderId } = req.params;
      const { latitude, longitude } = req.body;

      // ตรวจสอบข้อมูลที่จำเป็น
      if (latitude === undefined || longitude === undefined) {
        res.status(400).json({
          success: false,
          message: 'Latitude and longitude are required'
        });
        return;
      }

      // อัพเดทตำแหน่ง
      const updatedTracking = await trackingService.updateTrackingLocation(
        parseInt(orderId),
        { latitude, longitude }
      );

      if (!updatedTracking) {
        res.status(404).json({
          success: false,
          message: 'No tracking found for this order'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: updatedTracking
      });
    } catch (error) {
      logger.error('Error updating tracking location', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred while updating tracking location'
      });
    }
  }
}