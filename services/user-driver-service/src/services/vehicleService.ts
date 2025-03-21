// user-driver-service/src/services/vehicleService.ts

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { publishMessage } from '../config/rabbitmq';
import { DriverService } from './driverService';

const prisma = new PrismaClient();
const driverService = new DriverService();

interface VehicleCreateInput {
  driver_id: number;
  vehicle_type: 'motorcycle' | 'car' | 'pickup' | 'truck';
  max_weight_kg: number;
  max_volume_m3: number;
  length_m: number;
  width_m: number;
  height_m: number;
  status?: 'available' | 'busy' | 'offline';
}

interface VehicleUpdateInput {
  vehicle_type?: 'motorcycle' | 'car' | 'pickup' | 'truck';
  max_weight_kg?: number;
  max_volume_m3?: number;
  length_m?: number;
  width_m?: number;
  height_m?: number;
  status?: 'available' | 'busy' | 'offline';
}

export class VehicleService {
  /**
   * สร้างข้อมูลรถใหม่
   */
  public async createVehicle(data: VehicleCreateInput): Promise<any> {
    try {
      // ตรวจสอบว่ามีข้อมูลคนขับอยู่ในระบบหรือไม่
      const driver = await prisma.driver.findUnique({
        where: { id: data.driver_id },
      });

      if (!driver) {
        throw new Error('Driver not found');
      }

      // สร้างข้อมูลรถใหม่
      const newVehicle = await prisma.vehicle.create({
        data: {
          driver_id: data.driver_id,
          vehicle_type: data.vehicle_type as any,
          max_weight_kg: data.max_weight_kg,
          max_volume_m3: data.max_volume_m3,
          length_m: data.length_m,
          width_m: data.width_m,
          height_m: data.height_m,
          status: (data.status as any) || 'offline',
        },
      });

      // ส่งข้อความแจ้งเตือนการสร้างรถใหม่
      await publishMessage('user-events', {
        event: 'VEHICLE_CREATED',
        data: {
          vehicleId: newVehicle.id,
          driverId: data.driver_id,
          type: newVehicle.vehicle_type,
          status: newVehicle.status,
          timestamp: new Date().toISOString(),
        },
      });

      logger.info('Created new vehicle', {
        vehicleId: newVehicle.id,
        driverId: data.driver_id,
        type: newVehicle.vehicle_type,
      });

      return newVehicle;
    } catch (error) {
      logger.error('Error creating vehicle', error);
      throw error;
    }
  }

  /**
   * ดึงข้อมูลรถตาม ID
   */
  public async getVehicleById(vehicleId: number): Promise<any> {
    try {
      const vehicle = await prisma.vehicle.findUnique({
        where: { id: vehicleId },
      });

      if (!vehicle) {
        return null;
      }

      return vehicle;
    } catch (error) {
      logger.error('Error fetching vehicle by ID', error);
      throw error;
    }
  }

  /**
   * ดึงข้อมูลรถตาม driver_id
   */
  public async getVehiclesByDriverId(driverId: number): Promise<any> {
    try {
      const vehicles = await prisma.vehicle.findMany({
        where: { driver_id: driverId },
      });

      return vehicles;
    } catch (error) {
      logger.error('Error fetching vehicles by driver ID', error);
      throw error;
    }
  }

  /**
   * อัพเดทสถานะรถ
   */
  public async updateVehicleStatus(
    vehicleId: number,
    status: 'available' | 'busy' | 'offline',
  ): Promise<any> {
    try {
      const vehicle = await prisma.vehicle.findUnique({
        where: { id: vehicleId },
      });

      if (!vehicle) {
        throw new Error('Vehicle not found');
      }

      // อัพเดทสถานะ
      const updatedVehicle = await prisma.vehicle.update({
        where: { id: vehicleId },
        data: { status },
      });

      // ส่งข้อความแจ้งเตือนการเปลี่ยนสถานะรถ
      await publishMessage('user-events', {
        event: 'VEHICLE_STATUS_CHANGED',
        data: {
          vehicleId,
          driverId: vehicle.driver_id,
          status,
          previousStatus: vehicle.status,
          timestamp: new Date().toISOString(),
        },
      });

      logger.info('Updated vehicle status', {
        vehicleId,
        status,
        previousStatus: vehicle.status,
      });

      return updatedVehicle;
    } catch (error) {
      logger.error('Error updating vehicle status', error);
      throw error;
    }
  }

  /**
   * อัพเดทข้อมูลรถ
   */
  public async updateVehicle(
    vehicleId: number,
    data: VehicleUpdateInput,
  ): Promise<any> {
    try {
      const vehicle = await prisma.vehicle.findUnique({
        where: { id: vehicleId },
      });

      if (!vehicle) {
        throw new Error('Vehicle not found');
      }

      // เก็บสถานะเดิมเพื่อตรวจสอบการเปลี่ยนแปลง
      const previousStatus = vehicle.status;

      // อัพเดทข้อมูลรถ
      const updatedVehicle = await prisma.vehicle.update({
        where: { id: vehicleId },
        data,
      });

      // ถ้ามีการเปลี่ยนสถานะ ให้ส่งข้อความแจ้งเตือน
      if (data.status && data.status !== previousStatus) {
        await publishMessage('user-events', {
          event: 'VEHICLE_STATUS_CHANGED',
          data: {
            vehicleId,
            driverId: vehicle.driver_id,
            status: data.status,
            previousStatus,
            timestamp: new Date().toISOString(),
          },
        });
      }

      logger.info('Updated vehicle information', {
        vehicleId,
        updatedFields: Object.keys(data),
      });

      return updatedVehicle;
    } catch (error) {
      logger.error('Error updating vehicle', error);
      throw error;
    }
  }

  /**
   * ลบข้อมูลรถ
   */
  public async deleteVehicle(vehicleId: number): Promise<boolean> {
    try {
      await prisma.vehicle.delete({
        where: { id: vehicleId },
      });

      logger.info('Deleted vehicle', { vehicleId });

      return true;
    } catch (error) {
      logger.error('Error deleting vehicle', error);
      throw error;
    }
  }

  /**
   * ค้นหารถ
   */
  public async searchVehicles(options: {
    status?: string;
    type?: string;
    driverId?: number;
    page?: number;
    limit?: number;
  }): Promise<any> {
    try {
      const { status, type, driverId, page = 1, limit = 10 } = options;
      const skip = (page - 1) * limit;

      // เงื่อนไขในการค้นหา
      const where: any = {};

      if (status) {
        where.status = status;
      }

      if (type) {
        where.vehicle_type = type;
      }

      if (driverId) {
        where.driver_id = driverId;
      }

      // ค้นหารถและนับจำนวนทั้งหมด
      const [vehicles, totalCount] = await Promise.all([
        prisma.vehicle.findMany({
          where,
          skip,
          take: limit,
          orderBy: { created_at: 'desc' },
        }),
        prisma.vehicle.count({ where }),
      ]);

      // เพิ่มข้อมูลคนขับแต่ละคัน
      const vehiclesWithDriverData = await Promise.all(
        vehicles.map(async (vehicle) => {
          const driverData = await driverService.getDriverWithUserData(
            vehicle.driver_id,
          );
          return {
            ...vehicle,
            driver: driverData,
          };
        }),
      );

      const totalPages = Math.ceil(totalCount / limit);

      return {
        items: vehiclesWithDriverData,
        pagination: {
          total: totalCount,
          page,
          limit,
          totalPages,
        },
      };
    } catch (error) {
      logger.error('Error searching vehicles', error);
      throw error;
    }
  }

  /**
   * ค้นหารถที่พร้อมให้บริการตามประเภทและความสามารถในการบรรทุก
   */
  public async findAvailableVehiclesByCapacity(requirements: {
    weight_kg: number;
    volume_m3?: number;
    dimensions?: { length_m: number; width_m: number; height_m: number };
  }): Promise<any> {
    try {
      // เงื่อนไขพื้นฐานในการค้นหา
      const where: any = {
        status: 'available',
        max_weight_kg: {
          gte: requirements.weight_kg,
        },
      };

      // เพิ่มเงื่อนไขปริมาตรถ้ามีการระบุ
      if (requirements.volume_m3) {
        where.max_volume_m3 = {
          gte: requirements.volume_m3,
        };
      }

      // เพิ่มเงื่อนไขขนาดถ้ามีการระบุ
      if (requirements.dimensions) {
        where.length_m = {
          gte: requirements.dimensions.length_m,
        };
        where.width_m = {
          gte: requirements.dimensions.width_m,
        };
        where.height_m = {
          gte: requirements.dimensions.height_m,
        };
      }

      // ค้นหารถที่เหมาะสม
      const suitableVehicles = await prisma.vehicle.findMany({
        where,
        orderBy: [
          { max_weight_kg: 'asc' }, // เรียงจากน้อยไปมากเพื่อให้ได้รถที่เหมาะสมที่สุด
          { max_volume_m3: 'asc' },
        ],
      });

      // เพิ่มข้อมูลคนขับแต่ละคัน
      const vehiclesWithDriverData = await Promise.all(
        suitableVehicles.map(async (vehicle) => {
          const driverData = await driverService.getDriverWithUserData(
            vehicle.driver_id,
          );
          return {
            ...vehicle,
            driver: driverData,
          };
        }),
      );

      logger.info('Found available vehicles by capacity', {
        requirements,
        vehiclesCount: suitableVehicles.length,
      });

      return vehiclesWithDriverData;
    } catch (error) {
      logger.error('Error finding available vehicles by capacity', error);
      throw error;
    }
  }
}
