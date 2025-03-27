// notification-service/src/consumers/index.ts

import { consumeMessages } from '../config/rabbitmq';
import { logger } from '../utils/logger';
import { NotificationService } from '../services/notificationService';
import { UserCacheService } from '../services/userCacheService';
import { NotificationType } from '../types';

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
    
    // รับข้อความจากคิว 'auth_service_events'
    await consumeMessages('auth_service_events', async (message) => {
      logger.info('Received auth event:', message);
      
      // ลองบันทึก raw message เพื่อดีบัก
      logger.debug('Raw auth message content:', JSON.stringify(message));
      
      switch (message.event) {
        case 'USER_REGISTERED':
          try {
            // ตรวจสอบโครงสร้างข้อมูลที่ได้รับจริงๆ
            const userId = message.data.id || message.data.userId;
            
            if (!userId) {
              logger.error('Missing required userId/id in USER_REGISTERED event', message);
              return;
            }
            
            // แปลงข้อมูลให้เหมาะสมกับที่ handleUserRegistered ต้องการ
            const userData = {
              userId: userId,             // ค่าเดิม (UUID)
              user_id: String(userId),    // แปลงเป็น string
              email: message.data.email || "",
              full_name: message.data.full_name || "",
              phone: message.data.phone || "",
              role: message.data.role || "customer",
              timestamp: message.data.createdAt || new Date().toISOString()
            };
            
            logger.info('Processing USER_REGISTERED with data:', JSON.stringify(userData));
            await handleUserRegistered(userData);
          } catch (err) {
            logger.error('Error processing USER_REGISTERED event:', err);
          }
          break;
          
        case 'USER_LOGGED_IN':
          // อาจเพิ่มการจัดการเมื่อผู้ใช้เข้าสู่ระบบ (ถ้าต้องการ)
          logger.info('User login event received, no action needed');
          break;
          
        default:
          logger.debug('Ignored auth event:', message.event);
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
    
    // สร้างการแจ้งเตือนให้ลูกค้า
    const notification = {
      user_id: String(userId),  // แปลงเป็น string
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
    
    // กำหนดข้อความตามสถานะออเดอร์
    let description: string;
    
    switch (newStatus) {
      case 'confirmed':
        description = 'Driver has accepted your order';
        break;
      case 'in_progress':
        description = 'Your order is in transit';
        break;
      case 'arrived_at_pickup':
        description = 'Driver has arrived at pickup location';
        break;
      case 'arrived_at_dropoff':
        description = 'Driver has arrived at dropoff location';
        break;
      case 'completed':
        description = 'Your order has been delivered';
        break;
      case 'cancelled':
        description = 'Your order has been cancelled';
        break;
      default:
        description = `Your order status has changed to ${newStatus}`;
    }
    
    // สร้างการแจ้งเตือน
    const notification = {
      user_id: String(userId),  // แปลงเป็น string
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
    
    // สร้างการแจ้งเตือนให้ลูกค้า
    const notification = {
      user_id: String(userId),  // แปลงเป็น string
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
    
    // สร้างการแจ้งเตือน
    const notification = {
      user_id: String(userId),  // แปลงเป็น string
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
 * จัดการเมื่อมีการลงทะเบียนผู้ใช้ใหม่
 */
const handleUserRegistered = async (data: any): Promise<void> => {
  try {
    // ตรวจสอบว่ามี userId (หรือ user_id) หรือไม่
    const userId = data.userId || data.user_id;
    
    if (!userId) {
      logger.error('Cannot process USER_REGISTERED event: userId is missing', data);
      return;
    }
    
    const { email, full_name, phone, role, timestamp } = data;
    
    logger.debug('Processing user registration with data:', JSON.stringify({
      user_id: String(userId),  // แปลงเป็น string
      email,
      full_name,
      phone,
      role,
      timestamp
    }));
    
    // บันทึกข้อมูลผู้ใช้ลงในฐานข้อมูลท้องถิ่น
    await userCacheService.cacheUserData({
      user_id: String(userId),  // แปลงเป็น string
      email: email || "",
      full_name: full_name || "",
      phone: phone || "",
      role: role || "customer",
      created_at: timestamp ? new Date(timestamp) : new Date()
    });
    
    // ส่งอีเมลต้อนรับผู้ใช้ใหม่ (ถ้ามีอีเมล)
    if (email) {
      await notificationService.sendWelcomeEmail({
        user_id: String(userId),  // แปลงเป็น string
        email,
        full_name: full_name || "",
        phone: phone || "",
        role: role || "customer"
      });
    } else {
      logger.warn('Cannot send welcome email: missing email', { userId });
    }
    
    logger.info('Processed USER_REGISTERED event successfully', { userId });
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
    await userCacheService.updateCachedUserData(String(userId), {  // แปลงเป็น string
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
    const userData = await userCacheService.getUserData(String(userId));  // แปลงเป็น string
    
    if (userData && userData.email) {
      // ส่งอีเมลต้อนรับคนขับใหม่
      await notificationService.sendDriverWelcomeEmail({
        user_id: String(userId),  // แปลงเป็น string
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