// order-matching-service/src/routes/orderRoutes.ts

import express from 'express';
import { OrderController } from '../controllers/orderController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = express.Router();
const orderController = new OrderController();

/**
 * @swagger
 * /orders:
 *   post:
 *     summary: Create a new order
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customer_id
 *               - pickup_location
 *               - dropoff_location
 *               - package_details
 *               - payment_method
 *             properties:
 *               customer_id:
 *                 type: integer
 *               pickup_location:
 *                 type: object
 *                 properties:
 *                   latitude:
 *                     type: number
 *                   longitude:
 *                     type: number
 *                   address:
 *                     type: string
 *               dropoff_location:
 *                 type: object
 *                 properties:
 *                   latitude:
 *                     type: number
 *                   longitude:
 *                     type: number
 *                   address:
 *                     type: string
 *               package_details:
 *                 type: object
 *                 required:
 *                   - weight_kg
 *                 properties:
 *                   weight_kg:
 *                     type: number
 *                   volume_m3:
 *                     type: number
 *                   length_m:
 *                     type: number
 *                   width_m:
 *                     type: number
 *                   height_m:
 *                     type: number
 *                   is_fragile:
 *                     type: boolean
 *                   special_handling:
 *                     type: string
 *                   description:
 *                     type: string
 *               payment_method:
 *                 type: string
 *                 enum: [CASH, CREDIT_CARD, BANK_TRANSFER, WALLET]
 *     responses:
 *       201:
 *         description: Order created successfully
 *       400:
 *         description: Invalid input data
 *       500:
 *         description: Server error
 */
router.post('/', authMiddleware, orderController.createOrder);

/**
 * @swagger
 * /orders/{id}/confirm:
 *   post:
 *     summary: Confirm order and start matching process
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order confirmed and matching process started
 *       404:
 *         description: Order not found
 *       500:
 *         description: Server error
 */
router.post('/:id/confirm', authMiddleware, orderController.confirmOrder);

/**
 * @swagger
 * /orders/{id}/cancel:
 *   post:
 *     summary: Cancel order
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Order ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Order cancelled successfully
 *       400:
 *         description: Order cannot be cancelled in current state
 *       404:
 *         description: Order not found
 *       500:
 *         description: Server error
 */
router.post('/:id/cancel', authMiddleware, orderController.cancelOrder);

/**
 * @swagger
 * /orders/{id}/status:
 *   patch:
 *     summary: Update order status
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [PENDING, CONFIRMED, MATCHING, MATCHED, DRIVER_ACCEPTED, DRIVER_REJECTED, DRIVER_ASSIGNED, PICKED_UP, IN_TRANSIT, DELIVERED, CANCELLED, FAILED]
 *               note:
 *                 type: string
 *     responses:
 *       200:
 *         description: Order status updated successfully
 *       400:
 *         description: Invalid input data
 *       404:
 *         description: Order not found
 *       500:
 *         description: Server error
 */
router.patch('/:id/status', authMiddleware, orderController.updateOrderStatus);

/**
 * @swagger
 * /orders/{id}:
 *   get:
 *     summary: Get order by ID
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order details
 *       404:
 *         description: Order not found
 *       500:
 *         description: Server error
 */
router.get('/:id', authMiddleware, orderController.getOrderById);

/**
 * @swagger
 * /orders/customer/{customerId}:
 *   get:
 *     summary: Get orders for a customer
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Customer ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, CONFIRMED, MATCHING, MATCHED, DRIVER_ACCEPTED, DRIVER_REJECTED, DRIVER_ASSIGNED, PICKED_UP, IN_TRANSIT, DELIVERED, CANCELLED, FAILED]
 *         description: Filter by order status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of records per page
 *     responses:
 *       200:
 *         description: List of orders
 *       500:
 *         description: Server error
 */
router.get('/customer/:customerId', authMiddleware, orderController.getCustomerOrders);

/**
 * @swagger
 * /orders/driver/{driverId}:
 *   get:
 *     summary: Get orders for a driver
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: driverId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Driver ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, CONFIRMED, MATCHING, MATCHED, DRIVER_ACCEPTED, DRIVER_REJECTED, DRIVER_ASSIGNED, PICKED_UP, IN_TRANSIT, DELIVERED, CANCELLED, FAILED]
 *         description: Filter by order status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of records per page
 *     responses:
 *       200:
 *         description: List of orders
 *       500:
 *         description: Server error
 */
router.get('/driver/:driverId', authMiddleware, orderController.getDriverOrders);

/**
 * @swagger
 * /orders:
 *   get:
 *     summary: Search orders
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, CONFIRMED, MATCHING, MATCHED, DRIVER_ACCEPTED, DRIVER_REJECTED, DRIVER_ASSIGNED, PICKED_UP, IN_TRANSIT, DELIVERED, CANCELLED, FAILED]
 *         description: Filter by order status
 *       - in: query
 *         name: customer_id
 *         schema:
 *           type: integer
 *         description: Filter by customer ID
 *       - in: query
 *         name: driver_id
 *         schema:
 *           type: integer
 *         description: Filter by driver ID
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by date range (from)
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by date range (to)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of records per page
 *     responses:
 *       200:
 *         description: List of orders
 *       500:
 *         description: Server error
 */
router.get('/', authMiddleware, orderController.searchOrders);

export default router;