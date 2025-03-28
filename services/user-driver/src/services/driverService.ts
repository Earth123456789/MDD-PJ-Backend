// user-driver-service/src/services/driverService.ts

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { publishMessage } from '../config/rabbitmq';

const prisma = new PrismaClient();

interface DriverCreateInput {
  user_id: string;
  license_number: string;
  id_card_number: string;
  current_location?: {
    latitude: number;
    longitude: number;
  };
}

interface DriverUpdateInput {
  license_number?: string;
  id_card_number?: string;
  current_location?: {
    latitude: number;
    longitude: number;
  };
  status?: 'active' | 'inactive' | 'suspended';
  rating?: number;
}

export class DriverService {
  /**
   * สร้างข้อมูลคนขับใหม่
   */
  public async createDriver(data: DriverCreateInput): Promise<any> {
    try {
      // ตรวจสอบว่ามีข้อมูลคนขับอยู่แล้วหรือไม่
      const existingDriver = await prisma.driver.findUnique({
        where: { user_id: data.user_id },
      });

      if (existingDriver) {
        throw new Error('Driver profile already exists for this user');
      }

      // สร้างข้อมูลคนขับใหม่
      const newDriver = await prisma.driver.create({
        data: {
          user_id: data.user_id,
          license_number: data.license_number,
          id_card_number: data.id_card_number,
          current_location: data.current_location
            ? data.current_location
            : undefined,
          status: 'inactive', // เริ่มต้นเป็น inactive รอการตรวจสอบ
          rating: 0, // เริ่มต้นด้วยคะแนน 0
        },
      });

      // ส่งข้อความแจ้งเตือนการสร้างคนขับใหม่
      await publishMessage('user-events', {
        event: 'DRIVER_CREATED',
        data: {
          driverId: newDriver.id,
          userId: data.user_id,
          status: newDriver.status,
          timestamp: new Date().toISOString(),
        },
      });

      logger.info('Created new driver', {
        driverId: newDriver.id,
        userId: data.user_id,
      });

      return newDriver;
    } catch (error) {
      logger.error('Error creating driver', error);
      throw error;
    }
  }

  /**
   * ดึงข้อมูลคนขับตาม ID
   */
  public async getDriverById(driverId: string): Promise<any> {
    try {
      const driver = await prisma.driver.findUnique({
        where: { id: driverId },
      });

      if (!driver) {
        return null;
      }

      return driver;
    } catch (error) {
      logger.error('Error fetching driver by ID', error);
      throw error;
    }
  }

  /**
   * ดึงข้อมูลคนขับตาม user_id
   */
  public async getDriverByUserId(userId: string): Promise<any> {
    try {
      const driver = await prisma.driver.findUnique({
        where: { user_id: userId },
      });

      if (!driver) {
        return null;
      }

      return driver;
    } catch (error) {
      logger.error('Error fetching driver by user ID', error);
      throw error;
    }
  }

  /**
   * อัพเดทสถานะคนขับ
   */
  public async updateDriverStatus(
    driverId: string,
    status: 'active' | 'inactive' | 'suspended',
  ): Promise<any> {
    try {
      const driver = await prisma.driver.findUnique({
        where: { id: driverId },
      });

      if (!driver) {
        throw new Error('Driver not found');
      }

      // อัพเดทสถานะ
      const updatedDriver = await prisma.driver.update({
        where: { id: driverId },
        data: { status },
      });

      // ส่งข้อความแจ้งเตือนการเปลี่ยนสถานะคนขับ
      await publishMessage('user-events', {
        event: 'DRIVER_STATUS_CHANGED',
        data: {
          driverId,
          userId: driver.user_id,
          status,
          previousStatus: driver.status,
          timestamp: new Date().toISOString(),
        },
      });

      logger.info('Updated driver status', {
        driverId,
        status,
        previousStatus: driver.status,
      });

      return updatedDriver;
    } catch (error) {
      logger.error('Error updating driver status', error);
      throw error;
    }
  }

  /**
   * อัพเดทตำแหน่งคนขับ
   */
  public async updateDriverLocation(
    driverId: string,
    location: { latitude: number; longitude: number },
  ): Promise<any> {
    try {
      const driver = await prisma.driver.findUnique({
        where: { id: driverId },
      });

      if (!driver) {
        throw new Error('Driver not found');
      }

      // อัพเดทตำแหน่ง
      const updatedDriver = await prisma.driver.update({
        where: { id: driverId },
        data: { current_location: location },
      });

      // ส่งข้อความแจ้งเตือนการเปลี่ยนตำแหน่งคนขับ
      await publishMessage('driver-location-events', {
        event: 'DRIVER_LOCATION_UPDATED',
        data: {
          driverId,
          userId: driver.user_id,
          location,
          timestamp: new Date().toISOString(),
        },
      });

      logger.info('Updated driver location', {
        driverId,
        latitude: location.latitude,
        longitude: location.longitude,
      });

      return updatedDriver;
    } catch (error) {
      logger.error('Error updating driver location', error);
      throw error;
    }
  }

  /**
   * อัพเดทข้อมูลคนขับ
   */
  public async updateDriver(
    driverId: string,
    data: DriverUpdateInput,
  ): Promise<any> {
    try {
      const driver = await prisma.driver.findUnique({
        where: { id: driverId },
      });

      if (!driver) {
        throw new Error('Driver not found');
      }

      // เก็บสถานะเดิมเพื่อตรวจสอบการเปลี่ยนแปลง
      const previousStatus = driver.status;

      // อัพเดทข้อมูลคนขับ
      const updatedDriver = await prisma.driver.update({
        where: { id: driverId },
        data,
      });

      // ถ้ามีการเปลี่ยนสถานะ ให้ส่งข้อความแจ้งเตือน
      if (data.status && data.status !== previousStatus) {
        await publishMessage('user-events', {
          event: 'DRIVER_STATUS_CHANGED',
          data: {
            driverId,
            userId: driver.user_id,
            status: data.status,
            previousStatus,
            timestamp: new Date().toISOString(),
          },
        });
      }

      // ถ้ามีการอัพเดทตำแหน่ง ให้ส่งข้อความแจ้งเตือน
      if (data.current_location) {
        await publishMessage('driver-location-events', {
          event: 'DRIVER_LOCATION_UPDATED',
          data: {
            driverId,
            userId: driver.user_id,
            location: data.current_location,
            timestamp: new Date().toISOString(),
          },
        });
      }

      logger.info('Updated driver information', {
        driverId,
        updatedFields: Object.keys(data),
      });

      return updatedDriver;
    } catch (error) {
      logger.error('Error updating driver', error);
      throw error;
    }
  }

  /**
   * ค้นหาคนขับ
   */
  public async searchDrivers(options: {
    status?: string;
    query?: string;
    page?: number;
    limit?: number;
  }): Promise<any> {
    try {
      const { status, query, page = 1, limit = 10 } = options;
      const skip = (page - 1) * limit;

      // เงื่อนไขในการค้นหา
      const where: any = {};

      if (status) {
        where.status = status;
      }

      if (query) {
        // ค้นหาในข้อมูลคนขับโดยตรง
        where.OR = [
          { license_number: { contains: query } },
          { id_card_number: { contains: query } },
        ];
      }

      // ค้นหาคนขับและนับจำนวนทั้งหมด
      const [drivers, totalCount] = await Promise.all([
        prisma.driver.findMany({
          where,
          skip,
          take: limit,
          orderBy: { created_at: 'desc' },
        }),
        prisma.driver.count({ where }),
      ]);

      const totalPages = Math.ceil(totalCount / limit);

      return {
        items: drivers,
        pagination: {
          total: totalCount,
          page,
          limit,
          totalPages,
        },
      };
    } catch (error) {
      logger.error('Error searching drivers', error);
      throw error;
    }
  }

  /**
   * ให้คะแนนคนขับ
   */
  public async rateDriver(driverId: string, rating: number): Promise<any> {
    try {
      if (rating < 0 || rating > 5) {
        throw new Error('Rating must be between 0 and 5');
      }

      const driver = await prisma.driver.findUnique({
        where: { id: driverId },
      });

      if (!driver) {
        throw new Error('Driver not found');
      }

      // อัพเดทคะแนน (คำนวณคะแนนเฉลี่ยจะอยู่ในระบบอื่น)
      const updatedDriver = await prisma.driver.update({
        where: { id: driverId },
        data: { rating },
      });

      logger.info('Updated driver rating', {
        driverId,
        rating,
      });

      return updatedDriver;
    } catch (error) {
      logger.error('Error rating driver', error);
      throw error;
    }
  }

  /**
   * ลบข้อมูลคนขับ
   */
  public async deleteDriver(driverId: string): Promise<boolean> {
    try {
      await prisma.driver.delete({
        where: { id: driverId },
      });

      logger.info('Deleted driver', { driverId });

      return true;
    } catch (error) {
      logger.error('Error deleting driver', error);
      throw error;
    }
  }

  /**
   * ค้นหาคนขับที่พร้อมให้บริการในบริเวณใกล้เคียง
   */
  public async findAvailableDriversNearby(
    location: { latitude: number; longitude: number },
    radius: number = 5,
  ): Promise<any> {
    try {
      // ดึงข้อมูลคนขับที่มีสถานะ active โดยไม่มีเงื่อนไข current_location
      const activeDrivers = await prisma.driver.findMany({
        where: {
          status: 'active',
        },
      });

      // กรองคนขับที่มี current_location และคำนวณระยะทาง
      const driversInRadius = activeDrivers
        .filter((driver) => driver.current_location !== null)
        .map((driver) => {
          const driverLocation = driver.current_location as any;
          if (
            !driverLocation ||
            !driverLocation.latitude ||
            !driverLocation.longitude
          )
            return null;

          const distance = this.calculateDistance(
            location.latitude,
            location.longitude,
            driverLocation.latitude,
            driverLocation.longitude,
          );

          return {
            ...driver,
            distance, // ระยะทางในหน่วยกิโลเมตร
          };
        })
        .filter((driver) => driver !== null && driver.distance <= radius)
        .sort((a, b) => a!.distance - b!.distance);

      logger.info('Found available drivers nearby', {
        location,
        radius,
        driversCount: driversInRadius.length,
      });

      return driversInRadius;
    } catch (error) {
      logger.error('Error finding available drivers nearby', error);
      throw error;
    }
  }

  /**
   * คำนวณระยะทางระหว่างสองจุด (Haversine formula)
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // รัศมีของโลกในหน่วยกิโลเมตร
    const dLat = this.degToRad(lat2 - lat1);
    const dLon = this.degToRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.degToRad(lat1)) *
        Math.cos(this.degToRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // ระยะทางในหน่วยกิโลเมตร

    return distance;
  }

  /**
   * แปลงองศาเป็นเรเดียน
   */
  private degToRad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}