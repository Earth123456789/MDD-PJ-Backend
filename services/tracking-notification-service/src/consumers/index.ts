// tracking-notification-service/src/consumers/index.ts

import { consumeMessages } from '../config/rabbitmq';
import { logger } from '../utils/logger';
import { TrackingService } from '../services/trackingService';
import { NotificationService } from '../services/notificationService';
import { UserCacheService } from '../services/userCacheService';
import { TrackingStatus, NotificationType } from '../types';

const trackingService = new TrackingService();
const notificationService = new NotificationService();
const userCacheService = new UserCacheService();

export const setupEventConsumers = async (): Promise<void> => {
  try {
    // รับข้อความจากคิว 'order-events'
    await consumeMessages('order-events', async (message) => {
      logger.info('Received order event:', message);
      
      switch (message.event) {
        case 'ORDER_CREATED':
          await handleOrderCreated(message.data);
          break;
          
        case 'ORDER_STATUS_CHANGED':
          await handleOrderStatusChanged(message.data);
          break;
          
        case 'ORDER_MATCHED':
          await handleOrderMatched(message.data);
          break;
          
        case 'ORDER_CANCELLED':
          await handleOrderCancelled(message.data);
          break;
          
        default:
          logger.debug('Ignored order event:', message.event);
      }
    });

    // รับข้อความจากคิว 'driver-location-events'
    await consumeMessages('driver-location-events', async (message) => {
      logger.info('Received driver location event:', message);
      
      if (message.event === 'DRIVER_LOCATION_UPDATED') {
        await handleDriverLocationUpdated(message.data);
      }
    });
    
    // รับข้อความจากคิว 'user-events'
    await consumeMessages('user-events', async (message) => {
      logger.info('Received user event:', message);
      
      switch (message.event) {
        case 'USER_REGISTERED':
          await handleUserRegistered(message.data);
          break;
          
        case 'USER_UPDATED':
          await handleUserUpdated(message.data);
          break;

        case 'DRIVER_CREATED':
          await handleDriverCreated(message.data);
          break;
          
        default:
          logger.debug('Ignored user event:', message.event);
      }
    });
    
    logger.info('Event consumers setup completed');
  } catch (error) {
    logger.error('Failed to setup event consumers:', error);
    throw error;
  }
};

/**
 * จัดการเมื่อมีการสร้างออเดอร์ใหม่
 */
const handleOrderCreated = async (data: any): Promise<void> => {
  try {
    const { orderId, userId, status, timestamp } = data;
    
    // สร้าง tracking entry
    await trackingService.createTrackingUpdate({
      order_id: orderId,
      status: TrackingStatus.ORDER_CREATED,
      description: 'Order has been created',
    });
    
    // สร้างการแจ้งเตือนให้ลูกค้า
    const notification = {
      user_id: userId,
      title: 'Order Created',
      message: `Your order #${orderId} has been created successfully.`,
      type: NotificationType.ORDER_UPDATE,
      order_id: orderId,
      status: 'created'
    };
    
    // ส่งการแจ้งเตือนและอีเมลในคำสั่งเดียว
    await notificationService.createNotification(notification);
    
    logger.info('Processed ORDER_CREATED event', { orderId });
  } catch (error) {
    logger.error('Error handling ORDER_CREATED event:', error);
  }
};

/**
 * จัดการเมื่อสถานะออเดอร์เปลี่ยน
 */
const handleOrderStatusChanged = async (data: any): Promise<void> => {
  try {
    const { orderId, userId, oldStatus, newStatus, timestamp } = data;
    
    // กำหนดสถานะการติดตามตามสถานะออเดอร์
    let trackingStatus: TrackingStatus | null = null;
    let description: string;
    
    switch (newStatus) {
      case 'confirmed':
        trackingStatus = TrackingStatus.DRIVER_ACCEPTED;
        description = 'Driver has accepted your order';
        break;
      case 'in_progress':
        trackingStatus = TrackingStatus.IN_TRANSIT;
        description = 'Your order is in transit';
        break;
      case 'arrived_at_pickup':
        trackingStatus = TrackingStatus.DRIVER_ARRIVED_AT_PICKUP;
        description = 'Driver has arrived at pickup location';
        break;
      case 'arrived_at_dropoff':
        trackingStatus = TrackingStatus.ARRIVED_AT_DROPOFF;
        description = 'Driver has arrived at dropoff location';
        break;
      case 'completed':
        trackingStatus = TrackingStatus.DELIVERED;
        description = 'Your order has been delivered';
        break;
      case 'cancelled':
        trackingStatus = TrackingStatus.CANCELLED;
        description = 'Your order has been cancelled';
        break;
      default:
        trackingStatus = null;
        description = '';
    }
    
    if (trackingStatus) {
      // อัพเดท tracking
      await trackingService.createTrackingUpdate({
        order_id: orderId,
        status: trackingStatus,
        description
      });
      
      // สร้างการแจ้งเตือน
      const notification = {
        user_id: userId,
        title: `Order ${newStatus}`,
        message: description,
        type: NotificationType.ORDER_UPDATE,
        order_id: orderId,
        status: newStatus,
        oldStatus: oldStatus,
        newStatus: newStatus
      };
      
      // ส่งการแจ้งเตือนและอีเมลในคำสั่งเดียว
      await notificationService.createNotification(notification);
      
      logger.info('Processed ORDER_STATUS_CHANGED event', { orderId, newStatus });
    }
  } catch (error) {
    logger.error('Error handling ORDER_STATUS_CHANGED event:', error);
  }
};

/**
 * จัดการเมื่อออเดอร์ถูกจับคู่กับคนขับ
 */
const handleOrderMatched = async (data: any): Promise<void> => {
  try {
    const { orderId, userId, driverId, vehicleId, driverName, timestamp } = data;
    
    // อัพเดท tracking
    await trackingService.createTrackingUpdate({
      order_id: orderId,
      status: TrackingStatus.DRIVER_MATCHED,
      description: `Driver ${driverName} has been assigned to your order`
    });
    
    // สร้างการแจ้งเตือนให้ลูกค้า
    const notification = {
      user_id: userId,
      title: 'Driver Assigned',
      message: `${driverName} has been assigned to your order #${orderId}.`,
      type: NotificationType.DRIVER_UPDATE,
      order_id: orderId,
      status: 'matched',
      driverName: driverName
    };
    
    // ส่งการแจ้งเตือนและอีเมลในคำสั่งเดียว
    await notificationService.createNotification(notification);
    
    logger.info('Processed ORDER_MATCHED event', { orderId, driverId });
  } catch (error) {
    logger.error('Error handling ORDER_MATCHED event:', error);
  }
};

/**
 * จัดการเมื่อออเดอร์ถูกยกเลิก
 */
const handleOrderCancelled = async (data: any): Promise<void> => {
  try {
    const { orderId, userId, reason, timestamp } = data;
    
    // อัพเดท tracking
    await trackingService.createTrackingUpdate({
      order_id: orderId,
      status: TrackingStatus.CANCELLED,
      description: `Order cancelled: ${reason || 'No reason provided'}`
    });
    
    // สร้างการแจ้งเตือน
    const notification = {
      user_id: userId,
      title: 'Order Cancelled',
      message: `Your order #${orderId} has been cancelled.`,
      type: NotificationType.ORDER_UPDATE,
      order_id: orderId,
      status: 'cancelled',
      reason: reason || 'No reason provided'
    };
    
    // ส่งการแจ้งเตือนและอีเมลในคำสั่งเดียว
    await notificationService.createNotification(notification);
    
    logger.info('Processed ORDER_CANCELLED event', { orderId });
  } catch (error) {
    logger.error('Error handling ORDER_CANCELLED event:', error);
  }
};

/**
 * จัดการเมื่อตำแหน่งคนขับมีการอัพเดท
 */
const handleDriverLocationUpdated = async (data: any): Promise<void> => {
  try {
    const { driverId, orderId, location, timestamp } = data;
    
    // ถ้าไม่มี orderId เกี่ยวข้อง ให้ข้ามไป
    if (!orderId) {
      return;
    }
    
    // อัพเดทตำแหน่งในการติดตาม
    await trackingService.updateTrackingLocation(orderId, location);
    
    logger.info('Processed DRIVER_LOCATION_UPDATED event', { driverId, orderId });
  } catch (error) {
    logger.error('Error handling DRIVER_LOCATION_UPDATED event:', error);
  }
};

/**
 * จัดการเมื่อมีการลงทะเบียนผู้ใช้ใหม่
 */
const handleUserRegistered = async (data: any): Promise<void> => {
  try {
    const { userId, email, full_name, phone, role, timestamp } = data;
    
    // บันทึกข้อมูลผู้ใช้ลงในฐานข้อมูลท้องถิ่น
    await userCacheService.cacheUserData({
      user_id: userId,
      email,
      full_name,
      phone,
      role,
      created_at: new Date(timestamp)
    });
    
    // ส่งอีเมลต้อนรับผู้ใช้ใหม่
    await notificationService.sendWelcomeEmail({
      user_id: userId,
      email,
      full_name,
      phone,
      role
    });
    
    logger.info('Processed USER_REGISTERED event', { userId });
  } catch (error) {
    logger.error('Error handling USER_REGISTERED event:', error);
  }
};

/**
 * จัดการเมื่อมีการอัพเดทข้อมูลผู้ใช้
 */
const handleUserUpdated = async (data: any): Promise<void> => {
  try {
    const { userId, email, full_name, phone, timestamp } = data;
    
    // อัพเดทข้อมูลในฐานข้อมูลท้องถิ่น
    await userCacheService.updateCachedUserData(userId, {
      email,
      full_name,
      phone,
      updated_at: new Date(timestamp)
    });
    
    logger.info('Processed USER_UPDATED event', { userId });
  } catch (error) {
    logger.error('Error handling USER_UPDATED event:', error);
  }
};

/**
 * จัดการเมื่อมีการสร้างข้อมูลคนขับใหม่
 */
const handleDriverCreated = async (data: any): Promise<void> => {
  try {
    const { driverId, userId, status, license_number, timestamp } = data;
    
    // ดึงข้อมูลผู้ใช้
    const userData = await userCacheService.getUserData(userId);
    
    if (userData && userData.email) {
      // ส่งอีเมลต้อนรับคนขับใหม่
      await notificationService.sendDriverWelcomeEmail({
        user_id: userId,
        driverId: driverId,
        license_number: license_number,
        status: status
      });
    }
    
    logger.info('Processed DRIVER_CREATED event', { driverId, userId });
  } catch (error) {
    logger.error('Error handling DRIVER_CREATED event:', error);
  }
};