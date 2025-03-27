// tracking-notification-service/src/controllers/notificationController.ts

import { Request, Response } from 'express';
import { NotificationService } from '../services/notificationService';
import { logger } from '../utils/logger';

const notificationService = new NotificationService();

export class NotificationController {
  /**
   * ดึงการแจ้งเตือนของผู้ใช้
   * @route GET /api/notifications
   */
  public async getUserNotifications(req: Request, res: Response): Promise<void> {
    try {
      // ดึง user_id จาก middleware ตรวจสอบ token
      const userId = (req as any).user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
        return;
      }

      // ดึงพารามิเตอร์จาก query string
      const { page = '1', limit = '20', unread_only = 'false' } = req.query;

      // ปรับปรุงการแปลงค่า unread_only - ใช้ String() เพื่อแปลงเป็น string อย่างปลอดภัย
      const unreadOnly = String(unread_only).toLowerCase() === 'true';

      logger.debug('Notification filter params', {
        userId,
        page,
        limit,
        unread_only_raw: unread_only,
        unreadOnly: unreadOnly
      });

      // ดึงการแจ้งเตือน
      const result = await notificationService.getUserNotifications(userId, {
        page: parseInt(String(page)),
        limit: parseInt(String(limit)),
        unreadOnly: unreadOnly
      });

      res.status(200).json({
        success: true,
        data: result.items,
        pagination: result.pagination
      });
    } catch (error) {
      logger.error('Error fetching user notifications', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred while fetching notifications'
      });
    }
  }
}