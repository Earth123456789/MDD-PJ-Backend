// tracking-notification-service/src/services/userCacheService.ts

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import axios from 'axios';

const prisma = new PrismaClient();

interface UserCacheData {
  user_id: number;
  email?: string;
  full_name?: string;
  phone?: string;
  role?: string;
  created_at?: Date;
  updated_at?: Date;
}

export class UserCacheService {
  /**
   * บันทึกข้อมูลผู้ใช้ลงใน cache
   */
  public async cacheUserData(data: UserCacheData): Promise<any> {
    try {
      // ตรวจสอบว่ามีข้อมูลอยู่แล้วหรือไม่
      const existingUser = await prisma.userCache.findUnique({
        where: { user_id: data.user_id }
      });

      if (existingUser) {
        // อัพเดตข้อมูลที่มีอยู่
        return await this.updateCachedUserData(data.user_id, data);
      } else {
        // สร้างข้อมูลใหม่
        const newUserCache = await prisma.userCache.create({
          data: {
            user_id: data.user_id,
            email: data.email,
            full_name: data.full_name,
            phone: data.phone,
            role: data.role,
            created_at: data.created_at || new Date(),
            updated_at: data.updated_at || new Date()
          }
        });

        logger.info('Cached new user data', { userId: data.user_id });
        return newUserCache;
      }
    } catch (error) {
      logger.error('Error caching user data', error);
      throw error;
    }
  }

  /**
   * อัพเดทข้อมูลผู้ใช้ใน cache
   */
  public async updateCachedUserData(userId: number, data: Partial<UserCacheData>): Promise<any> {
    try {
      const updatedUserCache = await prisma.userCache.update({
        where: { user_id: userId },
        data: {
          email: data.email,
          full_name: data.full_name,
          phone: data.phone,
          role: data.role,
          updated_at: data.updated_at || new Date()
        }
      });

      logger.info('Updated cached user data', { userId });
      return updatedUserCache;
    } catch (error) {
      logger.error('Error updating cached user data', error);
      throw error;
    }
  }

  /**
   * ดึงข้อมูลผู้ใช้จาก cache หรือจาก User-Driver Service
   */
  public async getUserData(userId: number): Promise<any> {
    try {
      // พยายามดึงข้อมูลจาก cache ก่อน
      let userData = await prisma.userCache.findUnique({
        where: { user_id: userId }
      });

      // ถ้าไม่พบข้อมูลใน cache หรือข้อมูลมีอายุมากกว่า 1 วัน ให้ดึงข้อมูลใหม่
      if (!userData) {
        // ดึงข้อมูลผู้ใช้จาก User-Driver Service โดยตรง
        const userServiceUrl = process.env.USER_DRIVER_SERVICE_URL || 'http://user-driver-service:3001/api';
        try {
          const response = await axios.get(`${userServiceUrl}/users/${userId}`);
          
          if (response.data && response.data.success) {
            const fetchedUserData = response.data.data;
            
            // บันทึกข้อมูลลงใน cache
            userData = await this.cacheUserData({
              user_id: userId,
              email: fetchedUserData.email,
              full_name: fetchedUserData.full_name,
              phone: fetchedUserData.phone,
              role: fetchedUserData.role
            });
            
            logger.info('Fetched and cached user data', { userId });
          }
        } catch (error) {
          logger.error('Error fetching user data from User-Driver Service', error);
          return null;
        }
      }

      return userData;
    } catch (error) {
      logger.error('Error fetching user data', error);
      return null;
    }
  }

  /**
   * ลบข้อมูลผู้ใช้จาก cache
   */
  public async deleteUserCache(userId: number): Promise<boolean> {
    try {
      await prisma.userCache.delete({
        where: { user_id: userId }
      });

      logger.info('Deleted user cache', { userId });
      return true;
    } catch (error) {
      logger.error('Error deleting user cache', error);
      return false;
    }
  }
}