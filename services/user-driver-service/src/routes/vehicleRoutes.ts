// user-driver-service/src/routes/vehicleRoutes.ts

import express from 'express';
import { VehicleController } from '../controllers/vehicleController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = express.Router();
const vehicleController = new VehicleController();

/**
 * @swagger
 * /vehicles:
 *   post:
 *     summary: Create a new vehicle
 *     tags: [Vehicles]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - driver_id
 *               - vehicle_type
 *               - max_weight_kg
 *               - max_volume_m3
 *               - length_m
 *               - width_m
 *               - height_m
 *             properties:
 *               driver_id:
 *                 type: string
 *               vehicle_type:
 *                 type: string
 *                 enum: [motorcycle, car, pickup, truck]
 *               max_weight_kg:
 *                 type: integer
 *               max_volume_m3:
 *                 type: number
 *                 format: float
 *               length_m:
 *                 type: number
 *                 format: float
 *               width_m:
 *                 type: number
 *                 format: float
 *               height_m:
 *                 type: number
 *                 format: float
 *               status:
 *                 type: string
 *                 enum: [available, busy, offline]
 *                 default: offline
 *     responses:
 *       201:
 *         description: Vehicle created successfully
 *       400:
 *         description: Invalid input data
 *       404:
 *         description: Driver not found
 *       500:
 *         description: Server error
 */
router.post('/', authMiddleware, vehicleController.createVehicle);

/**
 * @swagger
 * /vehicles/{id}:
 *   get:
 *     summary: Get vehicle by ID
 *     tags: [Vehicles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Vehicle ID
 *     responses:
 *       200:
 *         description: Vehicle details
 *       404:
 *         description: Vehicle not found
 *       500:
 *         description: Server error
 */
router.get('/:id', vehicleController.getVehicleById);

/**
 * @swagger
 * /vehicles/driver/{driverId}:
 *   get:
 *     summary: Get vehicles by driver ID
 *     tags: [Vehicles]
 *     parameters:
 *       - in: path
 *         name: driverId
 *         required: true
 *         schema:
 *           type: string
 *         description: Driver ID
 *     responses:
 *       200:
 *         description: List of vehicles
 *       500:
 *         description: Server error
 */
router.get('/driver/:driverId', vehicleController.getVehiclesByDriverId);

/**
 * @swagger
 * /vehicles/{id}/status:
 *   patch:
 *     summary: Update vehicle status
 *     tags: [Vehicles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Vehicle ID
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
 *                 enum: [available, busy, offline]
 *     responses:
 *       200:
 *         description: Vehicle status updated successfully
 *       400:
 *         description: Invalid input data
 *       404:
 *         description: Vehicle not found
 *       500:
 *         description: Server error
 */
router.patch(
  '/:id/status',
  authMiddleware,
  vehicleController.updateVehicleStatus,
);

/**
 * @swagger
 * /vehicles/{id}:
 *   patch:
 *     summary: Update vehicle
 *     tags: [Vehicles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Vehicle ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               vehicle_type:
 *                 type: string
 *                 enum: [motorcycle, car, pickup, truck]
 *               max_weight_kg:
 *                 type: integer
 *               max_volume_m3:
 *                 type: number
 *                 format: float
 *               length_m:
 *                 type: number
 *                 format: float
 *               width_m:
 *                 type: number
 *                 format: float
 *               height_m:
 *                 type: number
 *                 format: float
 *               status:
 *                 type: string
 *                 enum: [available, busy, offline]
 *     responses:
 *       200:
 *         description: Vehicle updated successfully
 *       400:
 *         description: Invalid input data
 *       404:
 *         description: Vehicle not found
 *       500:
 *         description: Server error
 */
router.patch('/:id', authMiddleware, vehicleController.updateVehicle);

/**
 * @swagger
 * /vehicles/{id}:
 *   delete:
 *     summary: Delete vehicle
 *     tags: [Vehicles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Vehicle ID
 *     responses:
 *       200:
 *         description: Vehicle deleted successfully
 *       500:
 *         description: Server error
 */
router.delete('/:id', authMiddleware, vehicleController.deleteVehicle);

/**
 * @swagger
 * /vehicles:
 *   get:
 *     summary: Search vehicles
 *     tags: [Vehicles]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [available, busy, offline]
 *         description: Filter by vehicle status
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [motorcycle, car, pickup, truck]
 *         description: Filter by vehicle type
 *       - in: query
 *         name: driver_id
 *         schema:
 *           type: string
 *         description: Filter by driver ID
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
 *         description: List of vehicles
 *       500:
 *         description: Server error
 */
router.get('/', vehicleController.searchVehicles);

/**
 * @swagger
 * /vehicles/capacity:
 *   get:
 *     summary: Find vehicles by capacity
 *     tags: [Vehicles]
 *     parameters:
 *       - in: query
 *         name: weight_kg
 *         required: true
 *         schema:
 *           type: number
 *         description: Required weight capacity in kg
 *       - in: query
 *         name: volume_m3
 *         schema:
 *           type: number
 *         description: Required volume capacity in cubic meters
 *       - in: query
 *         name: length_m
 *         schema:
 *           type: number
 *         description: Required length in meters
 *       - in: query
 *         name: width_m
 *         schema:
 *           type: number
 *         description: Required width in meters
 *       - in: query
 *         name: height_m
 *         schema:
 *           type: number
 *         description: Required height in meters
 *     responses:
 *       200:
 *         description: List of suitable vehicles
 *       400:
 *         description: Invalid input data
 *       500:
 *         description: Server error
 */
router.get('/capacity', vehicleController.findVehiclesByCapacity);

export default router;
