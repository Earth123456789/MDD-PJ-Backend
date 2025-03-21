// order-matching-service/src/controllers/orderController.ts

import { Request, Response } from 'express';
import { OrderStatus } from '../types';
import { logger } from '../utils/logger';
import orderService from '../services/orderService';
import matchingService from '../services/matchingService';

export class OrderController {
  /**
   * สร้างออเดอร์ใหม่
   * @route POST /api/orders
   */
  public async createOrder(req: Request, res: Response): Promise<void> {
    try {
      const {
        customer_id,
        pickup_location,
        dropoff_location,
        package_details,
        payment_method
      } = req.body;

      // ตรวจสอบข้อมูลที่จำเป็น
      if (!customer_id || !pickup_location || !dropoff_location || !package_details || !payment_method) {
        res.status(400).json({
          success: false,
          message: 'Missing required fields'
        });
        return;
      }

      // ตรวจสอบข้อมูลของพัสดุ
      if (!package_details.weight_kg) {
        res.status(400).json({
          success: false,
          message: 'Package weight is required'
        });
        return;
      }

      // สร้างออเดอร์ใหม่
      const newOrder = await orderService.createOrder({
        customer_id,
        pickup_location,
        dropoff_location,
        package_details,
        payment_method
      });

      res.status(201).json({
        success: true,
        data: newOrder
      });
    } catch (error: any) {
      logger.error('Error creating order', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred while creating order'
      });
    }
  }

  /**
   * ยืนยันออเดอร์และเริ่มกระบวนการจับคู่
   * @route POST /api/orders/:id/confirm
   */
  public async confirmOrder(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const orderId = parseInt(id);

      // อัพเดทสถานะออเดอร์เป็น CONFIRMED
      await orderService.updateOrderStatus(orderId, OrderStatus.CONFIRMED, 'Order confirmed by customer');

      // เริ่มกระบวนการจับคู่
      const matchingResult = await matchingService.startMatching(orderId);

      res.status(200).json({
        success: true,
        message: 'Order confirmed and matching process started',
        data: matchingResult
      });
    } catch (error: any) {
      logger.error('Error confirming order', error);

      if (error.message.includes('Order not found')) {
        res.status(404).json({
          success: false,
          message: 'Order not found'
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'An error occurred while confirming order'
      });
    }
  }

  /**
   * ยกเลิกออเดอร์
   * @route POST /api/orders/:id/cancel
   */
  public async cancelOrder(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const orderId = parseInt(id);

      // ยกเลิกออเดอร์
      const cancelledOrder = await orderService.cancelOrder(orderId, reason);

      res.status(200).json({
        success: true,
        message: 'Order cancelled successfully',
        data: cancelledOrder
      });
    } catch (error: any) {
      logger.error('Error cancelling order', error);

      if (error.message.includes('Order not found')) {
        res.status(404).json({
          success: false,
          message: 'Order not found'
        });
        return;
      }

      if (error.message.includes('Cannot cancel order')) {
        res.status(400).json({
          success: false,
          message: error.message
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'An error occurred while cancelling order'
      });
    }
  }

  /**
   * อัพเดทสถานะออเดอร์
   * @route PATCH /api/orders/:id/status
   */
  public async updateOrderStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status, note } = req.body;
      const orderId = parseInt(id);

      // ตรวจสอบสถานะ
      if (!status) {
        res.status(400).json({
          success: false,
          message: 'Status is required'
        });
        return;
      }

      // อัพเดทสถานะ
      const updatedOrder = await orderService.updateOrderStatus(
        orderId, 
        status as OrderStatus, 
        note
      );

      res.status(200).json({
        success: true,
        data: updatedOrder
      });
    } catch (error: any) {
      logger.error('Error updating order status', error);

      if (error.message.includes('Order not found')) {
        res.status(404).json({
          success: false,
          message: 'Order not found'
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'An error occurred while updating order status'
      });
    }
  }

  /**
   * ดึงข้อมูลออเดอร์ตาม ID
   * @route GET /api/orders/:id
   */
  public async getOrderById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const orderId = parseInt(id);

      // ดึงข้อมูลออเดอร์
      const order = await orderService.getOrderById(orderId);

      if (!order) {
        res.status(404).json({
          success: false,
          message: 'Order not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: order
      });
    } catch (error: any) {
      logger.error('Error fetching order', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred while fetching order'
      });
    }
  }

  /**
   * ดึงข้อมูลออเดอร์ของลูกค้า
   * @route GET /api/orders/customer/:customerId
   */
  public async getCustomerOrders(req: Request, res: Response): Promise<void> {
    try {
      const { customerId } = req.params;
      const { status, page = '1', limit = '10' } = req.query;

      // ดึงข้อมูลออเดอร์
      const result = await orderService.getCustomerOrders(
        parseInt(customerId),
        {
          status: status as OrderStatus,
          page: parseInt(page as string),
          limit: parseInt(limit as string)
        }
      );

      res.status(200).json({
        success: true,
        data: result.items,
        pagination: result.pagination
      });
    } catch (error: any) {
      logger.error('Error fetching customer orders', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred while fetching orders'
      });
    }
  }

  /**
   * ดึงข้อมูลออเดอร์ของคนขับ
   * @route GET /api/orders/driver/:driverId
   */
  public async getDriverOrders(req: Request, res: Response): Promise<void> {
    try {
      const { driverId } = req.params;
      const { status, page = '1', limit = '10' } = req.query;

      // ดึงข้อมูลออเดอร์
      const result = await orderService.getDriverOrders(
        parseInt(driverId),
        {
          status: status as OrderStatus,
          page: parseInt(page as string),
          limit: parseInt(limit as string)
        }
      );

      res.status(200).json({
        success: true,
        data: result.items,
        pagination: result.pagination
      });
    } catch (error: any) {
      logger.error('Error fetching driver orders', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred while fetching orders'
      });
    }
  }

  /**
   * ค้นหาออเดอร์
   * @route GET /api/orders
   */
  public async searchOrders(req: Request, res: Response): Promise<void> {
    try {
      const {
        status,
        customer_id,
        driver_id,
        date_from,
        date_to,
        page = '1',
        limit = '10'
      } = req.query;

      // แปลงข้อมูลวันที่
      let dateFrom: Date | undefined;
      let dateTo: Date | undefined;

      if (date_from) {
        dateFrom = new Date(date_from as string);
      }

      if (date_to) {
        dateTo = new Date(date_to as string);
      }

      // ค้นหาออเดอร์
      const result = await orderService.searchOrders({
        status: status as OrderStatus,
        customer_id: customer_id ? parseInt(customer_id as string) : undefined,
        driver_id: driver_id ? parseInt(driver_id as string) : undefined,
        date_from: dateFrom,
        date_to: dateTo,
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      });

      res.status(200).json({
        success: true,
        data: result.items,
        pagination: result.pagination
      });
    } catch (error: any) {
      logger.error('Error searching orders', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred while searching orders'
      });
    }
  }
}