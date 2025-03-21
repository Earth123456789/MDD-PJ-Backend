// tracking-notification-service/src/services/trackingService.ts

import { PrismaClient } from '@prisma/client';
import { TrackingStatus } from '../types';
import { logger } from '../utils/logger';
import { publishMessage } from '../config/rabbitmq';

const prisma = new PrismaClient();

interface TrackingUpdateInput {
  order_id: number;
  status: TrackingStatus;
  location?: { latitude: number; longitude: number };
  description?: string;
}

export class TrackingService {
  /**
   * สร้างข้อมูลการติดตามใหม่
   */
  public async createTrackingUpdate(data: TrackingUpdateInput): Promise<any> {
    try {
      const newTracking = await prisma.trackingUpdate.create({
        data: {
          order_id: data.order_id,
          status: data.status,
          location: data.location,
          description: data.description
        }
      });

      // ส่งข้อความแจ้งเตือนการอัพเดทการติดตาม
      await publishMessage('tracking-events', {
        event: 'TRACKING_UPDATED',
        data: {
          trackingId: newTracking.id,
          orderId: data.order_id,
          status: data.status,
          location: data.location,
          description: data.description,
          timestamp: new Date().toISOString()
        }
      });

      logger.info('Created new tracking update', {
        trackingId: newTracking.id,
        orderId: data.order_id,
        status: data.status
      });

      return newTracking;
    } catch (error) {
      logger.error('Error creating tracking update', error);
      throw error;
    }
  }

  /**
   * อัพเดทตำแหน่งในการติดตาม
   */
  public async updateTrackingLocation(orderId: number, location: { latitude: number; longitude: number }): Promise<any> {
    try {
      // หาข้อมูลการติดตามล่าสุดของออเดอร์นี้
      const latestTracking = await prisma.trackingUpdate.findFirst({
        where: { order_id: orderId },
        orderBy: { created_at: 'desc' }
      });

      if (!latestTracking) {
        logger.warn('No tracking found for order', { orderId });
        return null;
      }

      // อัพเดทตำแหน่ง
      const updatedTracking = await prisma.trackingUpdate.update({
        where: { id: latestTracking.id },
        data: { location }
      });

      // ส่งข้อความแจ้งเตือนการอัพเดทตำแหน่ง
      await publishMessage('tracking-events', {
        event: 'TRACKING_LOCATION_UPDATED',
        data: {
          trackingId: updatedTracking.id,
          orderId,
          status: updatedTracking.status,
          location,
          timestamp: new Date().toISOString()
        }
      });

      logger.info('Updated tracking location', {
        trackingId: updatedTracking.id,
        orderId
      });

      return updatedTracking;
    } catch (error) {
      logger.error('Error updating tracking location', error);
      throw error;
    }
  }

  /**
   * ดึงข้อมูลการติดตามของออเดอร์
   */
  public async getOrderTracking(orderId: number): Promise<any> {
    try {
      const tracking = await prisma.trackingUpdate.findMany({
        where: { order_id: orderId },
        orderBy: { created_at: 'desc' }
      });

      return tracking;
    } catch (error) {
      logger.error('Error fetching order tracking', error);
      throw error;
    }
  }

  /**
   * ดึงข้อมูลการติดตามล่าสุดของออเดอร์
   */
  public async getLatestOrderTracking(orderId: number): Promise<any> {
    try {
      const tracking = await prisma.trackingUpdate.findFirst({
        where: { order_id: orderId },
        orderBy: { created_at: 'desc' }
      });

      return tracking;
    } catch (error) {
      logger.error('Error fetching latest order tracking', error);
      throw error;
    }
  }
}