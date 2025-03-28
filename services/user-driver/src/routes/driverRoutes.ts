// user-driver-service/src/routes/driverRoutes.ts

import express from 'express';
import { DriverController } from '../controllers/driverController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = express.Router();
const driverController = new DriverController();

// ลบเส้นทาง '/register' ที่ใช้ registerDriver ออก

/**
 * @swagger
 * /drivers:
 *   post:
 *     summary: Create driver profile for existing user
 *     tags: [Drivers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - user_id
 *               - license_number
 *               - id_card_number
 *             properties:
 *               user_id:
 *                 type: string
 *               license_number:
 *                 type: string
 *               id_card_number:
 *                 type: string
 *               current_location:
 *                 type: object
 *                 properties:
 *                   latitude:
 *                     type: number
 *                   longitude:
 *                     type: number
 *     responses:
 *       201:
 *         description: Driver profile created successfully
 */
router.post('/', authMiddleware, driverController.createDriver);

/**
 * @swagger
 * /drivers/{id}:
 *   get:
 *     summary: Get driver by ID
 *     tags: [Drivers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Driver ID
 *     responses:
 *       200:
 *         description: Driver details
 */
router.get('/:id', driverController.getDriverById);

/**
 * @swagger
 * /drivers/user/{userId}:
 *   get:
 *     summary: Get driver by user ID
 *     tags: [Drivers]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: Driver details
 */
router.get('/user/:userId', driverController.getDriverByUserId);

/**
 * @swagger
 * /drivers/{id}/status:
 *   patch:
 *     summary: Update driver status
 *     tags: [Drivers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Driver ID
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
 *                 enum: [active, inactive, suspended]
 *     responses:
 *       200:
 *         description: Driver status updated successfully
 */
router.patch(
  '/:id/status',
  authMiddleware,
  driverController.updateDriverStatus,
);

/**
 * @swagger
 * /drivers/{id}/location:
 *   patch:
 *     summary: Update driver location
 *     tags: [Drivers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Driver ID
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
 *         description: Driver location updated successfully
 */
router.patch(
  '/:id/location',
  authMiddleware,
  driverController.updateDriverLocation,
);

/**
 * @swagger
 * /drivers/{id}:
 *   patch:
 *     summary: Update driver profile
 *     tags: [Drivers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Driver ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               license_number:
 *                 type: string
 *               id_card_number:
 *                 type: string
 *               current_location:
 *                 type: object
 *                 properties:
 *                   latitude:
 *                     type: number
 *                   longitude:
 *                     type: number
 *               status:
 *                 type: string
 *                 enum: [active, inactive, suspended]
 *               rating:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 5
 *     responses:
 *       200:
 *         description: Driver updated successfully
 */
router.patch('/:id', authMiddleware, driverController.updateDriver);

/**
 * @swagger
 * /drivers/{id}/rate:
 *   post:
 *     summary: Rate a driver
 *     tags: [Drivers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Driver ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rating
 *             properties:
 *               rating:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 5
 *     responses:
 *       200:
 *         description: Driver rated successfully
 */
router.post('/:id/rate', driverController.rateDriver);

/**
 * @swagger
 * /drivers/{id}:
 *   delete:
 *     summary: Delete driver
 *     tags: [Drivers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Driver ID
 *     responses:
 *       200:
 *         description: Driver deleted successfully
 */
router.delete('/:id', authMiddleware, driverController.deleteDriver);

/**
 * @swagger
 * /drivers:
 *   get:
 *     summary: Search drivers
 *     tags: [Drivers]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, suspended]
 *         description: Filter by driver status
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *         description: Search term (name, license, id card)
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
 *         description: Items per page
 *     responses:
 *       200:
 *         description: List of drivers
 */
router.get('/', driverController.searchDrivers);

// ลบเส้นทาง '/nearby' ที่ใช้ findNearbyDrivers ออก

export default router;