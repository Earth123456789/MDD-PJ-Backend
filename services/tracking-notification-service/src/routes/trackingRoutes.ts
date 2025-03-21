// tracking-notification-service/src/routes/trackingRoutes.ts

import express from 'express';
import { TrackingController } from '../controllers/trackingController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = express.Router();
const trackingController = new TrackingController();

/**
 * @swagger
 * /tracking/{orderId}:
 *   get:
 *     summary: Get tracking history for an order
 *     tags: [Tracking]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Tracking history
 *       500:
 *         description: Server error
 */
router.get('/:orderId', authMiddleware, trackingController.getOrderTracking);

/**
 * @swagger
 * /tracking/{orderId}/latest:
 *   get:
 *     summary: Get latest tracking update for an order
 *     tags: [Tracking]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Latest tracking update
 *       404:
 *         description: Tracking not found
 *       500:
 *         description: Server error
 */
router.get('/:orderId/latest', authMiddleware, trackingController.getLatestOrderTracking);

/**
 * @swagger
 * /tracking/{orderId}:
 *   post:
 *     summary: Create tracking update for an order
 *     tags: [Tracking]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
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
 *                 enum: [ORDER_CREATED, DRIVER_MATCHED, DRIVER_ACCEPTED, DRIVER_ARRIVED_AT_PICKUP, PACKAGE_PICKED_UP, IN_TRANSIT, ARRIVED_AT_DROPOFF, DELIVERED, CANCELLED]
 *               location:
 *                 type: object
 *                 properties:
 *                   latitude:
 *                     type: number
 *                   longitude:
 *                     type: number
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Tracking update created
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */
router.post('/:orderId', authMiddleware, trackingController.createTrackingUpdate);

/**
 * @swagger
 * /tracking/{orderId}/location:
 *   patch:
 *     summary: Update tracking location for an order
 *     tags: [Tracking]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - latitude
 *               - longitude
 *             properties:
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *     responses:
 *       200:
 *         description: Location updated
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Tracking not found
 *       500:
 *         description: Server error
 */
router.patch('/:orderId/location', authMiddleware, trackingController.updateTrackingLocation);

export default router;