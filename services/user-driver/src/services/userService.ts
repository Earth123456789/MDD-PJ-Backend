// user-driver-service/src/services/userService.ts

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { publishMessage } from '../config/rabbitmq';

const prisma = new PrismaClient();

interface UserUpdateInput {
  full_name?: string;
  phone?: string;
  email?: string;
  avatar?: string;
}

// ประกาศ interface เพื่อใช้กับผลลัพธ์จาก raw query
interface CountResult {
  count: number | BigInt;
}

export class UserService {
  /**
   * ดึงข้อมูลผู้ใช้ตาม ID
   */
  public async getUserById(userId: string): Promise<any> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return null;
      }

      // ตัดข้อมูลรหัสผ่านออกก่อนส่งกลับ
      const { password, ...userWithoutPassword } = user;

      // นับจำนวนการแจ้งเตือนที่ยังไม่อ่าน (ถ้ามีฟีเจอร์นี้)
      const unreadNotificationsCount = await this.countUnreadNotifications(userId);

      // จัดรูปแบบข้อมูลให้ตรงกับที่ frontend คาดหวัง
      return {
        ...userWithoutPassword,
        data: {
          full_name: user.full_name,
          avatar: user.avatar,
          notifications: unreadNotificationsCount
        }
      };
    } catch (error) {
      logger.error('Error fetching user by ID', error);
      throw error;
    }
  }

  /**
   * อัพเดทข้อมูลผู้ใช้
   */
  public async updateUser(userId: string, data: UserUpdateInput): Promise<any> {
    try {
      // ตรวจสอบว่ามีผู้ใช้อยู่ในระบบหรือไม่
      const existingUser = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!existingUser) {
        throw new Error('User not found');
      }

      // อัพเดทข้อมูลผู้ใช้
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data,
      });

      // ตัดข้อมูลรหัสผ่านออกก่อนส่งกลับ
      const { password, ...userWithoutPassword } = updatedUser;

      // ส่ง event แจ้งเตือนการอัพเดทข้อมูลผู้ใช้
      await publishMessage('user_profile_events', {
        event: 'USER_PROFILE_UPDATED',
        data: {
          userId,
          updatedFields: Object.keys(data),
          timestamp: new Date().toISOString(),
        },
      });

      logger.info('Updated user', {
        userId,
        updatedFields: Object.keys(data),
      });

      return {
        ...userWithoutPassword,
        data: {
          full_name: updatedUser.full_name,
          avatar: updatedUser.avatar,
          notifications: await this.countUnreadNotifications(userId)
        }
      };
    } catch (error) {
      logger.error('Error updating user', error);
      throw error;
    }
  }

  /**
   * นับจำนวนการแจ้งเตือนที่ยังไม่อ่าน
   */
  private async countUnreadNotifications(userId: string): Promise<number> {
    try {
      // ตรวจสอบว่ามีตาราง notification หรือไม่
      const hasNotificationTable = await this.checkIfTableExists('notification');
      
      if (!hasNotificationTable) {
        return 0; // ถ้าไม่มีตาราง ให้คืนค่า 0
      }
      
      // นับจำนวนการแจ้งเตือนที่ยังไม่อ่าน
      const result = await prisma.$queryRaw<CountResult[]>`
        SELECT COUNT(*)::integer as count FROM notification 
        WHERE user_id = ${userId} AND read = false
      `;
      
      // ตรวจสอบผลลัพธ์และแปลงเป็น number ในทุกกรณี
      if (result && result.length > 0) {
        const countValue = result[0].count;
        // แปลงค่าเป็น number ในทุกกรณี
        return Number(countValue);
      }
      
      return 0;
    } catch (error) {
      logger.error('Error counting unread notifications', error);
      return 0; // กรณีเกิดข้อผิดพลาด ให้คืนค่า 0
    }
  }
  
  /**
   * ตรวจสอบว่ามีตารางในฐานข้อมูลหรือไม่
   */
  private async checkIfTableExists(tableName: string): Promise<boolean> {
    try {
      // สำหรับ PostgreSQL
      interface TableResult {
        table_name: string;
      }
      
      const tables = await prisma.$queryRaw<TableResult[]>`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = ${tableName}
      `;
      
      return tables.length > 0;
    } catch (error) {
      logger.error(`Error checking if table ${tableName} exists`, error);
      return false;
    }
  }

  /**
   * ค้นหาผู้ใช้
   */
  public async searchUsers(options: {
    role?: string;
    query?: string;
    page?: number;
    limit?: number;
  }): Promise<any> {
    try {
      const { role, query, page = 1, limit = 10 } = options;
      const skip = (page - 1) * limit;

      // เงื่อนไขในการค้นหา
      const where: any = {};

      if (role) {
        where.role = role;
      }

      if (query) {
        where.OR = [
          { email: { contains: query, mode: 'insensitive' } },
          { full_name: { contains: query, mode: 'insensitive' } },
          { phone: { contains: query } },
        ];
      }

      // ค้นหาผู้ใช้และนับจำนวนทั้งหมด
      const [users, totalCount] = await Promise.all([
        prisma.user.findMany({
          where,
          select: {
            id: true,
            email: true,
            full_name: true,
            phone: true,
            role: true,
            avatar: true,
            created_at: true,
            updated_at: true,
          },
          skip,
          take: limit,
          orderBy: { created_at: 'desc' },
        }),
        prisma.user.count({ where }),
      ]);

      const totalPages = Math.ceil(totalCount / limit);

      return {
        items: users,
        pagination: {
          total: totalCount,
          page,
          limit,
          totalPages,
        },
      };
    } catch (error) {
      logger.error('Error searching users', error);
      throw error;
    }
  }
}