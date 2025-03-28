// user-driver-service/src/controllers/userController.ts

import { Request, Response } from 'express';
import { UserService } from '../services/userService';
import { logger } from '../utils/logger';

const userService = new UserService();

export class UserController {
  /**
   * ดึงข้อมูลผู้ใช้ปัจจุบัน
   * @route GET /api/users/me
   */
  public async getCurrentUser(req: Request, res: Response): Promise<void> {
    try {
      // ดึง user_id จาก middleware ตรวจสอบ token
      const userId = (req as any).user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      // ดึงข้อมูลผู้ใช้
      const user = await userService.getUserById(userId);

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      logger.error('Error fetching current user', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred while fetching user data',
      });
    }
  }

  /**
   * ดึงข้อมูลผู้ใช้ตาม ID
   * @route GET /api/users/:id
   */
  public async getUserById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // ดึงข้อมูลผู้ใช้
      const user = await userService.getUserById(id);

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      logger.error('Error fetching user by ID', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred while fetching user data',
      });
    }
  }

  /**
   * อัพเดทข้อมูลผู้ใช้
   * @route PATCH /api/users/:id
   */
  public async updateUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { full_name, phone, avatar } = req.body; // เพิ่ม avatar กลับมา

      // ตรวจสอบสิทธิ์ - ผู้ใช้ต้องอัพเดทข้อมูลตัวเองเท่านั้น หรือเป็นแอดมิน
      const currentUserId = (req as any).user?.userId;
      const userRole = (req as any).user?.role;
      
      if (currentUserId !== id && userRole !== 'admin') {
        res.status(403).json({
          success: false,
          message: 'You can only update your own profile',
        });
        return;
      }

      // ตรวจสอบว่ามีข้อมูลที่จะอัพเดทหรือไม่
      if (!full_name && !phone && !avatar) {
        res.status(400).json({
          success: false,
          message: 'No data to update',
        });
        return;
      }

      // สร้างข้อมูลสำหรับอัพเดท
      const updateData: any = {};
      if (full_name) updateData.full_name = full_name;
      if (phone) updateData.phone = phone;
      if (avatar) updateData.avatar = avatar;

      // อัพเดทข้อมูลผู้ใช้
      const updatedUser = await userService.updateUser(id, updateData);

      res.status(200).json({
        success: true,
        data: updatedUser,
      });
    } catch (error: any) {
      logger.error('Error updating user', error);

      if (error.message === 'User not found') {
        res.status(404).json({
          success: false,
          message: 'User not found',
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'An error occurred while updating user',
      });
    }
  }

  /**
   * เปลี่ยนรหัสผ่าน - ใช้ Auth Service แทน
   * @route POST /api/users/:id/change-password
   */
  public async changePassword(req: Request, res: Response): Promise<void> {
    try {
      res.status(405).json({
        success: false,
        message: 'This operation is not supported. Please use Auth Service to change password.',
      });
    } catch (error) {
      logger.error('Error in change password endpoint', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  /**
   * ค้นหาผู้ใช้
   * @route GET /api/users
   */
  public async searchUsers(req: Request, res: Response): Promise<void> {
    try {
      const { role, query, page = '1', limit = '10' } = req.query;

      // ตรวจสอบสิทธิ์ - เฉพาะแอดมินเท่านั้น
      const userRole = (req as any).user?.role;
      
      if (userRole !== 'admin') {
        res.status(403).json({
          success: false,
          message: 'Only admin can search users',
        });
        return;
      }

      // ค้นหาผู้ใช้
      const result = await userService.searchUsers({
        role: role as string,
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
      logger.error('Error searching users', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred while searching users',
      });
    }
  }
}