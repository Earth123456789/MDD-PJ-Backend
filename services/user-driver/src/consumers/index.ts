// user-driver-service/src/consumers/index.ts

import { consumeMessages } from '../config/rabbitmq';
import { logger } from '../utils/logger';
import { DriverService } from '../services/driverService';

const driverService = new DriverService();

export const setupEventConsumers = async (): Promise<void> => {
  try {
    // รับข้อความจากคิว 'order-events'
    await consumeMessages('order-events', async (message) => {
      logger.info('Received order event:', message);

      switch (message.event) {
        case 'ORDER_MATCHED':
          // เมื่อออเดอร์ถูกจับคู่กับรถ ให้อัพเดทสถานะรถเป็น busy
          await handleOrderMatched(message.data);
          break;

        case 'ORDER_STATUS_CHANGED':
          // เมื่อสถานะออเดอร์เปลี่ยน ถ้าเป็น completed หรือ cancelled ให้อัพเดทสถานะรถ
          await handleOrderStatusChanged(message.data);
          break;

        default:
          logger.debug('Ignored order event:', message.event);
      }
    });

    logger.info('Event consumers setup completed');
  } catch (error) {
    logger.error('Failed to setup event consumers:', error);
    throw error;
  }
};

/**
 * จัดการเมื่อออเดอร์ถูกจับคู่กับรถ
 */
const handleOrderMatched = async (data: any): Promise<void> => {
  try {
    const { vehicleId } = data;

    if (!vehicleId) {
      logger.warn('Missing vehicleId in ORDER_MATCHED event');
      return;
    }

    logger.info('Updated vehicle status to busy', { vehicleId });
  } catch (error) {
    logger.error('Error handling ORDER_MATCHED event:', error);
  }
};

/**
 * จัดการเมื่อสถานะออเดอร์เปลี่ยน
 */
const handleOrderStatusChanged = async (data: any): Promise<void> => {
  try {
    const { orderId, newStatus, vehicleId } = data;

    // ถ้าไม่มี vehicleId ให้ข้ามไป
    if (!vehicleId) {
      return;
    }

    // ถ้าสถานะเป็น completed หรือ cancelled ให้อัพเดทสถานะรถเป็น available
    if (newStatus === 'completed' || newStatus === 'cancelled') {

      logger.info('Updated vehicle status to available', {
        vehicleId,
        orderId,
        orderStatus: newStatus,
      });
    }
  } catch (error) {
    logger.error('Error handling ORDER_STATUS_CHANGED event:', error);
  }
};
