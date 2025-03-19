// user-driver-service/src/services/userService.ts

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { publishMessage } from '../config/rabbitmq';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

interface UserCreateInput {
  email: string;
  password: string;
  full_name: string;
  phone: string;
  role: 'customer' | 'driver' | 'admin';
}

interface UserUpdateInput {
  full_name?: string;
  phone?: string;
  email?: string;
}

export class UserService {
  /**
   * สร้างผู้ใช้ใหม่
   */
  public async createUser(data: UserCreateInput): Promise<any> {
    try {
      // ตรวจสอบว่าอีเมลมีอยู่ในระบบแล้วหรือไม่
      const existingUser = await prisma.user.findUnique({
        where: { email: data.email }
      });

      if (existingUser) {
        throw new Error('Email already exists');
      }

      // เข้ารหัสรหัสผ่าน
      const hashedPassword = await bcrypt.hash(data.password, 10);

      // สร้างผู้ใช้ใหม่
      const newUser = await prisma.user.create({
        data: {
          email: data.email,
          password: hashedPassword,
          full_name: data.full_name,
          phone: data.phone,
          role: data.role as any
        }
      });

      // ตัดข้อมูลรหัสผ่านออกก่อนส่งกลับ
      const { password, ...userWithoutPassword } = newUser;

      // ส่งข้อความแจ้งเตือนการสร้างผู้ใช้ใหม่
      await publishMessage('user-events', {
        event: 'USER_REGISTERED',
        data: {
          userId: newUser.id,
          email: newUser.email,
          role: newUser.role,
          timestamp: new Date().toISOString()
        }
      });

      logger.info('Created new user', {
        userId: newUser.id,
        email: newUser.email,
        role: newUser.role
      });

      return userWithoutPassword;
    } catch (error) {
      logger.error('Error creating user', error);
      throw error;
    }
  }

  /**
   * เข้าสู่ระบบ
   */
  public async login(email: string, password: string): Promise<any> {
    try {
      // ค้นหาผู้ใช้ตามอีเมล
      const user = await prisma.user.findUnique({
        where: { email }
      });

      if (!user) {
        throw new Error('Invalid email or password');
      }

      // ตรวจสอบรหัสผ่าน
      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        throw new Error('Invalid email or password');
      }

      // สร้าง JWT token
      const token = jwt.sign(
        { 
          userId: user.id, 
          email: user.email, 
          role: user.role 
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );

      // ตัดข้อมูลรหัสผ่านออกก่อนส่งกลับ
      const { password: _, ...userWithoutPassword } = user;

      logger.info('User logged in', {
        userId: user.id,
        email: user.email
      });

      return {
        user: userWithoutPassword,
        token
      };
    } catch (error) {
      logger.error('Error during login', error);
      throw error;
    }
  }

  /**
   * ดึงข้อมูลผู้ใช้ตาม ID
   */
  public async getUserById(userId: number): Promise<any> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return null;
      }

      // ตัดข้อมูลรหัสผ่านออกก่อนส่งกลับ
      const { password, ...userWithoutPassword } = user;

      return userWithoutPassword;
    } catch (error) {
      logger.error('Error fetching user by ID', error);
      throw error;
    }
  }

  /**
   * อัพเดทข้อมูลผู้ใช้
   */
  public async updateUser(userId: number, data: UserUpdateInput): Promise<any> {
    try {
      // ตรวจสอบว่ามีผู้ใช้อยู่ในระบบหรือไม่
      const existingUser = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!existingUser) {
        throw new Error('User not found');
      }

      // ตรวจสอบอีเมลซ้ำถ้ามีการอัพเดทอีเมล
      if (data.email && data.email !== existingUser.email) {
        const emailExists = await prisma.user.findUnique({
          where: { email: data.email }
        });

        if (emailExists) {
          throw new Error('Email already exists');
        }
      }

      // อัพเดทข้อมูลผู้ใช้
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data
      });

      // ตัดข้อมูลรหัสผ่านออกก่อนส่งกลับ
      const { password, ...userWithoutPassword } = updatedUser;

      logger.info('Updated user', {
        userId,
        updatedFields: Object.keys(data)
      });

      return userWithoutPassword;
    } catch (error) {
      logger.error('Error updating user', error);
      throw error;
    }
  }

  /**
   * เปลี่ยนรหัสผ่าน
   */
  public async changePassword(userId: number, currentPassword: string, newPassword: string): Promise<boolean> {
    try {
      // ค้นหาผู้ใช้ตาม ID
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // ตรวจสอบรหัสผ่านปัจจุบัน
      const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

      if (!isPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      // เข้ารหัสรหัสผ่านใหม่
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // อัพเดทรหัสผ่าน
      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword }
      });

      logger.info('Changed user password', { userId });

      return true;
    } catch (error) {
      logger.error('Error changing password', error);
      throw error;
    }
  }

  /**
   * ลบผู้ใช้
   */
  public async deleteUser(userId: number): Promise<boolean> {
    try {
      await prisma.user.delete({
        where: { id: userId }
      });

      logger.info('Deleted user', { userId });

      return true;
    } catch (error) {
      logger.error('Error deleting user', error);
      throw error;
    }
  }

  /**
   * ค้นหาผู้ใช้
   */
  public async searchUsers(options: { role?: string, query?: string, page?: number, limit?: number }): Promise<any> {
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
          { phone: { contains: query } }
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
            created_at: true,
            updated_at: true
          },
          skip,
          take: limit,
          orderBy: { created_at: 'desc' }
        }),
        prisma.user.count({ where })
      ]);

      const totalPages = Math.ceil(totalCount / limit);

      return {
        items: users,
        pagination: {
          total: totalCount,
          page,
          limit,
          totalPages
        }
      };
    } catch (error) {
      logger.error('Error searching users', error);
      throw error;
    }
  }
}