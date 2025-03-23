// user-driver-service/src/controllers/userController.ts

import { Request, Response } from 'express';
import { UserService } from '../services/userService';
import { logger } from '../utils/logger';

const userService = new UserService();

export class UserController {
  /**
   * ลงทะเบียนผู้ใช้ใหม่
   * @route POST /api/users/register
   */
  public async registerUser(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, full_name, phone, role } = req.body;

      // ตรวจสอบข้อมูลที่จำเป็น
      if (!email || !password || !full_name || !phone) {
        res.status(400).json({
          success: false,
          message: 'Missing required fields',
        });
        return;
      }

      // ตรวจสอบบทบาท
      const validRoles = ['customer', 'driver', 'admin'];
      if (role && !validRoles.includes(role)) {
        res.status(400).json({
          success: false,
          message: `Invalid role. Must be one of: ${validRoles.join(', ')}`,
        });
        return;
      }

      // สร้างผู้ใช้ใหม่
      const newUser = await userService.createUser({
        email,
        password,
        full_name,
        phone,
        role: role || 'customer',
      });

      res.status(201).json({
        success: true,
        data: newUser,
      });
    } catch (error: any) {
      logger.error('Error registering user', error);

      if (error.message === 'Email already exists') {
        res.status(409).json({
          success: false,
          message: 'Email already in use',
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'An error occurred while registering user',
      });
    }
  }

  /**
   * เข้าสู่ระบบ
   * @route POST /api/users/login
   */
  public async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      // ตรวจสอบข้อมูลที่จำเป็น
      if (!email || !password) {
        res.status(400).json({
          success: false,
          message: 'Email and password are required',
        });
        return;
      }

      // ดำเนินการเข้าสู่ระบบ
      const loginResult = await userService.login(email, password);

      res.status(200).json({
        success: true,
        data: loginResult,
      });
    } catch (error: any) {
      logger.error('Error during login', error);

      if (error.message === 'Invalid email or password') {
        res.status(401).json({
          success: false,
          message: 'Invalid email or password',
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'An error occurred during login',
      });
    }
  }

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

      // ดึงข้อมูลผู้ใช้ โดยแปลง id จาก string เป็น number
      const user = await userService.getUserById(parseInt(id));

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
      const { full_name, phone, email } = req.body;

      // ตรวจสอบว่ามีข้อมูลที่จะอัพเดทหรือไม่
      if (!full_name && !phone && !email) {
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
      if (email) updateData.email = email;

      // อัพเดทข้อมูลผู้ใช้ โดยแปลง id จาก string เป็น number
      const updatedUser = await userService.updateUser(
        parseInt(id),
        updateData,
      );

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

      if (error.message === 'Email already exists') {
        res.status(409).json({
          success: false,
          message: 'Email already in use',
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
   * เปลี่ยนรหัสผ่าน
   * @route POST /api/users/:id/change-password
   */
  public async changePassword(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { current_password, new_password } = req.body;

      // ตรวจสอบข้อมูลที่จำเป็น
      if (!current_password || !new_password) {
        res.status(400).json({
          success: false,
          message: 'Current password and new password are required',
        });
        return;
      }

      // เปลี่ยนรหัสผ่าน โดยแปลง id จาก string เป็น number
      const result = await userService.changePassword(
        parseInt(id),
        current_password,
        new_password,
      );

      res.status(200).json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error: any) {
      logger.error('Error changing password', error);

      if (error.message === 'User not found') {
        res.status(404).json({
          success: false,
          message: 'User not found',
        });
        return;
      }

      if (error.message === 'Current password is incorrect') {
        res.status(401).json({
          success: false,
          message: 'Current password is incorrect',
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'An error occurred while changing password',
      });
    }
  }

  /**
   * ลบผู้ใช้
   * @route DELETE /api/users/:id
   */
  public async deleteUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // ลบผู้ใช้ โดยแปลง id จาก string เป็น number
      await userService.deleteUser(parseInt(id));

      res.status(200).json({
        success: true,
        message: 'User deleted successfully',
      });
    } catch (error) {
      logger.error('Error deleting user', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred while deleting user',
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
