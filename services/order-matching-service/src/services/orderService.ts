// order-matching-service/src/services/orderService.ts

import { PrismaClient } from '@prisma/client';
import { OrderStatus, PaymentMethod, PaymentStatus } from '../types';
import { logger } from '../utils/logger';
import { publishMessage } from '../config/rabbitmq';
import { calculateDistance, calculateEstimatedTime, calculatePrice } from '../utils/helpers';

const prisma = new PrismaClient();

interface LocationInput {
  latitude: number;
  longitude: number;
  address: string;
}

interface PackageInput {
  weight_kg: number;
  volume_m3?: number;
  length_m?: number;
  width_m?: number;
  height_m?: number;
  is_fragile?: boolean;
  special_handling?: string;
  description?: string;
}

interface OrderCreateInput {
  customer_id: number;
  pickup_location: LocationInput;
  dropoff_location: LocationInput;
  package_details: PackageInput;
  payment_method: PaymentMethod;
}

interface OrderUpdateInput {
  status?: OrderStatus;
  vehicle_id?: number;
  driver_id?: number;
  actual_time_min?: number;
  payment_status?: PaymentStatus;
}

class OrderService {
  /**
   * สร้างออเดอร์ใหม่
   */
  public async createOrder(data: OrderCreateInput): Promise<any> {
    try {
      // คำนวณระยะทาง, เวลา, และราคา
      const distance = calculateDistance(
        data.pickup_location.latitude,
        data.pickup_location.longitude,
        data.dropoff_location.latitude,
        data.dropoff_location.longitude
      );
      
      const estimatedTime = calculateEstimatedTime(distance);
      const price = calculatePrice(distance, data.package_details.weight_kg);
      
      // สร้างออเดอร์และรายละเอียดพัสดุในธุรกรรมเดียวกัน
      const newOrder = await prisma.$transaction(async (tx) => {
        // สร้างออเดอร์
        const order = await tx.order.create({
          data: {
            customer_id: data.customer_id,
            pickup_location: JSON.parse(JSON.stringify(data.pickup_location)),
            dropoff_location: JSON.parse(JSON.stringify(data.dropoff_location)),
            status: OrderStatus.PENDING,
            price,
            distance_km: distance,
            estimated_time_min: estimatedTime,
            payment_method: data.payment_method,
            payment_status: PaymentStatus.PENDING,
            status_history: {
              create: {
                status: OrderStatus.PENDING,
                note: 'Order created'
              }
            }
          }
        });
        
        // สร้างรายละเอียดพัสดุ
        const packageDetails = await tx.packageDetails.create({
          data: {
            order_id: order.id,
            weight_kg: data.package_details.weight_kg,
            volume_m3: data.package_details.volume_m3,
            length_m: data.package_details.length_m,
            width_m: data.package_details.width_m,
            height_m: data.package_details.height_m,
            is_fragile: data.package_details.is_fragile || false,
            special_handling: data.package_details.special_handling,
            description: data.package_details.description
          }
        });
        
        return { ...order, package_details: packageDetails };
      });
      
      // ส่งข้อความแจ้งเตือนการสร้างออเดอร์ใหม่
      await publishMessage('order-events', {
        event: 'ORDER_CREATED',
        data: {
          orderId: newOrder.id,
          userId: data.customer_id,
          status: 'PENDING',
          timestamp: new Date().toISOString()
        }
      });
      
      logger.info('Created new order', {
        orderId: newOrder.id,
        customerId: data.customer_id
      });
      
      return newOrder;
    } catch (error) {
      logger.error('Error creating order', error);
      throw error;
    }
  }
  
  /**
   * อัพเดทสถานะออเดอร์
   */
  public async updateOrderStatus(orderId: number, status: OrderStatus, note?: string): Promise<any> {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId }
      });
      
      if (!order) {
        throw new Error('Order not found');
      }
      
      const oldStatus = order.status;
      
      // อัพเดทสถานะและประวัติสถานะในธุรกรรมเดียวกัน
      const updatedOrder = await prisma.$transaction(async (tx) => {
        // อัพเดทสถานะออเดอร์
        const updated = await tx.order.update({
          where: { id: orderId },
          data: { 
            status,
            updated_at: new Date()
          }
        });
        
        // เพิ่มประวัติสถานะ
        await tx.statusHistory.create({
          data: {
            order_id: orderId,
            status,
            note
          }
        });
        
        return updated;
      });
      
      // ส่งข้อความแจ้งเตือนการเปลี่ยนสถานะออเดอร์
      await publishMessage('order-events', {
        event: 'ORDER_STATUS_CHANGED',
        data: {
          orderId,
          userId: order.customer_id,
          oldStatus,
          newStatus: status,
          timestamp: new Date().toISOString()
        }
      });
      
      logger.info('Updated order status', {
        orderId,
        oldStatus,
        newStatus: status
      });
      
      return updatedOrder;
    } catch (error) {
      logger.error('Error updating order status', error);
      throw error;
    }
  }
  
  /**
   * อัพเดทข้อมูลออเดอร์
   */
  public async updateOrder(orderId: number, data: OrderUpdateInput): Promise<any> {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId }
      });
      
      if (!order) {
        throw new Error('Order not found');
      }
      
      // เก็บสถานะเดิมเพื่อตรวจสอบการเปลี่ยนแปลง
      const oldStatus = order.status;
      
      // อัพเดทข้อมูลออเดอร์
      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: {
          ...data,
          updated_at: new Date()
        }
      });
      
      // ถ้ามีการเปลี่ยนสถานะ ให้เพิ่มประวัติสถานะ
      if (data.status && data.status !== oldStatus) {
        await prisma.statusHistory.create({
          data: {
            order_id: orderId,
            status: data.status
          }
        });
        
        // ส่งข้อความแจ้งเตือนการเปลี่ยนสถานะออเดอร์
        await publishMessage('order-events', {
          event: 'ORDER_STATUS_CHANGED',
          data: {
            orderId,
            userId: order.customer_id,
            oldStatus,
            newStatus: data.status,
            timestamp: new Date().toISOString()
          }
        });
      }
      
      // ถ้ามีการจับคู่กับคนขับและรถ
      if (data.driver_id && data.vehicle_id && 
         (order.driver_id !== data.driver_id || order.vehicle_id !== data.vehicle_id)) {
        await publishMessage('order-events', {
          event: 'ORDER_MATCHED',
          data: {
            orderId,
            userId: order.customer_id,
            driverId: data.driver_id,
            vehicleId: data.vehicle_id,
            timestamp: new Date().toISOString()
          }
        });
      }
      
      logger.info('Updated order', {
        orderId,
        updatedFields: Object.keys(data)
      });
      
      return updatedOrder;
    } catch (error) {
      logger.error('Error updating order', error);
      throw error;
    }
  }
  
  /**
   * ยกเลิกออเดอร์
   */
  public async cancelOrder(orderId: number, reason?: string): Promise<any> {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId }
      });
      
      if (!order) {
        throw new Error('Order not found');
      }
      
      // ตรวจสอบว่าสามารถยกเลิกได้หรือไม่
      const nonCancellableStatuses = ['DELIVERED', 'CANCELLED', 'FAILED'];
      if (nonCancellableStatuses.includes(order.status)) {
        throw new Error(`Cannot cancel order with status ${order.status}`);
      }
      
      // อัพเดทสถานะและประวัติสถานะในธุรกรรมเดียวกัน
      const cancelledOrder = await prisma.$transaction(async (tx) => {
        // อัพเดทสถานะออเดอร์
        const updated = await tx.order.update({
          where: { id: orderId },
          data: { 
            status: 'CANCELLED',
            updated_at: new Date()
          }
        });
        
        // เพิ่มประวัติสถานะ
        await tx.statusHistory.create({
          data: {
            order_id: orderId,
            status: 'CANCELLED',
            note: reason || 'Order cancelled'
          }
        });
        
        return updated;
      });
      
      // ส่งข้อความแจ้งเตือนการยกเลิกออเดอร์
      await publishMessage('order-events', {
        event: 'ORDER_CANCELLED',
        data: {
          orderId,
          userId: order.customer_id,
          reason,
          timestamp: new Date().toISOString()
        }
      });
      
      logger.info('Cancelled order', {
        orderId,
        reason
      });
      
      return cancelledOrder;
    } catch (error) {
      logger.error('Error cancelling order', error);
      throw error;
    }
  }
  
  /**
   * ดึงข้อมูลออเดอร์ตาม ID
   */
  public async getOrderById(orderId: number): Promise<any> {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          package_details: true,
          status_history: {
            orderBy: { timestamp: 'desc' }
          }
        }
      });
      
      return order;
    } catch (error) {
      logger.error('Error fetching order by ID', error);
      throw error;
    }
  }
  
  /**
   * ดึงข้อมูลออเดอร์ของลูกค้า
   */
  public async getCustomerOrders(customerId: number, options: { 
    status?: OrderStatus, 
    page?: number, 
    limit?: number 
  } = {}): Promise<any> {
    try {
      const { status, page = 1, limit = 10 } = options;
      const skip = (page - 1) * limit;
      
      // เงื่อนไขในการค้นหา
      const where: any = { customer_id: customerId };
      if (status) {
        where.status = status;
      }
      
      // ค้นหาออเดอร์และนับจำนวนทั้งหมด
      const [orders, totalCount] = await Promise.all([
        prisma.order.findMany({
          where,
          include: {
            package_details: true
          },
          skip,
          take: limit,
          orderBy: { created_at: 'desc' }
        }),
        prisma.order.count({ where })
      ]);
      
      const totalPages = Math.ceil(totalCount / limit);
      
      return {
        items: orders,
        pagination: {
          total: totalCount,
          page,
          limit,
          totalPages
        }
      };
    } catch (error) {
      logger.error('Error fetching customer orders', error);
      throw error;
    }
  }
  
  /**
   * ดึงข้อมูลออเดอร์ของคนขับ
   */
  public async getDriverOrders(driverId: number, options: { 
    status?: OrderStatus, 
    page?: number, 
    limit?: number 
  } = {}): Promise<any> {
    try {
      const { status, page = 1, limit = 10 } = options;
      const skip = (page - 1) * limit;
      
      // เงื่อนไขในการค้นหา
      const where: any = { driver_id: driverId };
      if (status) {
        where.status = status;
      }
      
      // ค้นหาออเดอร์และนับจำนวนทั้งหมด
      const [orders, totalCount] = await Promise.all([
        prisma.order.findMany({
          where,
          include: {
            package_details: true
          },
          skip,
          take: limit,
          orderBy: { created_at: 'desc' }
        }),
        prisma.order.count({ where })
      ]);
      
      const totalPages = Math.ceil(totalCount / limit);
      
      return {
        items: orders,
        pagination: {
          total: totalCount,
          page,
          limit,
          totalPages
        }
      };
    } catch (error) {
      logger.error('Error fetching driver orders', error);
      throw error;
    }
  }
  
  /**
   * ค้นหาออเดอร์
   */
  public async searchOrders(options: { 
    status?: OrderStatus,
    customer_id?: number,
    driver_id?: number,
    date_from?: Date,
    date_to?: Date,
    page?: number, 
    limit?: number 
  } = {}): Promise<any> {
    try {
      const { 
        status, 
        customer_id, 
        driver_id, 
        date_from, 
        date_to, 
        page = 1, 
        limit = 10 
      } = options;
      
      const skip = (page - 1) * limit;
      
      // เงื่อนไขในการค้นหา
      const where: any = {};
      if (status) where.status = status;
      if (customer_id) where.customer_id = customer_id;
      if (driver_id) where.driver_id = driver_id;
      
      // เงื่อนไขช่วงวันที่
      if (date_from || date_to) {
        where.created_at = {};
        if (date_from) where.created_at.gte = date_from;
        if (date_to) where.created_at.lte = date_to;
      }
      
      // ค้นหาออเดอร์และนับจำนวนทั้งหมด
      const [orders, totalCount] = await Promise.all([
        prisma.order.findMany({
          where,
          include: {
            package_details: true
          },
          skip,
          take: limit,
          orderBy: { created_at: 'desc' }
        }),
        prisma.order.count({ where })
      ]);
      
      const totalPages = Math.ceil(totalCount / limit);
      
      return {
        items: orders,
        pagination: {
          total: totalCount,
          page,
          limit,
          totalPages
        }
      };
    } catch (error) {
      logger.error('Error searching orders', error);
      throw error;
    }
  }
}

export default new OrderService();