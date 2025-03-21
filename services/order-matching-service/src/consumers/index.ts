// order-matching-service/src/consumers/index.ts

import { consumeMessages } from '../config/rabbitmq';
import { logger } from '../utils/logger';
import { PaymentStatus } from '../types';
import orderService from '../services/orderService';
import matchingService from '../services/matchingService';

export const setupEventConsumers = async (): Promise<void> => {
  try {
    // รับข้อความจากคิว 'driver-events'
    await consumeMessages('driver-events', async (message) => {
      logger.info('Received driver event:', message);
      
      switch (message.event) {
        case 'DRIVER_RESPONSE':
          await handleDriverResponse(message.data);
          break;
          
        case 'DRIVER_LOCATION_UPDATED':
          // อาจทำการอัพเดทข้อมูลเส้นทางการจัดส่ง
          break;
          
        default:
          logger.debug('Ignored driver event:', message.event);
      }
    });

    // รับข้อความจากคิว 'payment-events'
    await consumeMessages('payment-events', async (message) => {
      logger.info('Received payment event:', message);
      
      switch (message.event) {
        case 'PAYMENT_COMPLETED':
          await handlePaymentCompleted(message.data);
          break;
          
        case 'PAYMENT_FAILED':
          await handlePaymentFailed(message.data);
          break;
          
        default:
          logger.debug('Ignored payment event:', message.event);
      }
    });
    
    logger.info('Event consumers setup completed');
  } catch (error) {
    logger.error('Failed to setup event consumers:', error);
    throw error;
  }
};

/**
 * จัดการเมื่อคนขับตอบกลับเกี่ยวกับการจับคู่
 */
const handleDriverResponse = async (data: any): Promise<void> => {
  try {
    const { matchingId, response, reason } = data;
    
    if (!matchingId || !response) {
      logger.warn('Missing required fields in DRIVER_RESPONSE event');
      return;
    }
    
    if (response === 'accept') {
      // คนขับยอมรับงาน
      await matchingService.acceptMatching(matchingId);
    } else if (response === 'reject') {
      // คนขับปฏิเสธงาน
      await matchingService.rejectMatching(matchingId, reason);
    } else {
      logger.warn('Unknown response in DRIVER_RESPONSE event:', response);
    }
  } catch (error) {
    logger.error('Error handling DRIVER_RESPONSE event:', error);
  }
};

/**
 * จัดการเมื่อการชำระเงินสำเร็จ
 */
const handlePaymentCompleted = async (data: any): Promise<void> => {
  try {
    const { orderId, transactionId, amount } = data;
    
    if (!orderId) {
      logger.warn('Missing orderId in PAYMENT_COMPLETED event');
      return;
    }
    
    // อัพเดทสถานะการชำระเงินของออเดอร์
    await orderService.updateOrder(orderId, {
      payment_status: PaymentStatus.PAID
    });
    
    logger.info('Updated payment status to PAID', { orderId, transactionId });
  } catch (error) {
    logger.error('Error handling PAYMENT_COMPLETED event:', error);
  }
};

/**
 * จัดการเมื่อการชำระเงินล้มเหลว
 */
const handlePaymentFailed = async (data: any): Promise<void> => {
  try {
    const { orderId, transactionId, reason } = data;
    
    if (!orderId) {
      logger.warn('Missing orderId in PAYMENT_FAILED event');
      return;
    }
    
    // อัพเดทสถานะการชำระเงินของออเดอร์
    await orderService.updateOrder(orderId, {
      payment_status: PaymentStatus.FAILED
    });
    
    logger.info('Updated payment status to FAILED', { orderId, reason });
  } catch (error) {
    logger.error('Error handling PAYMENT_FAILED event:', error);
  }
};