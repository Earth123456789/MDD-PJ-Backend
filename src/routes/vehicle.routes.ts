import express from 'express';
import { body } from 'express-validator';
import * as vehicleController from '../controllers/vehicle.controller';
import validationMiddleware from '../middleware/validation.middleware';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Vehicles
 *   description: Vehicle management APIs
 */

/**
 * @swagger
 * /vehicles:
 *   get:
 *     summary: Get all vehicles
 *     description: Retrieve a list of all vehicles
 *     tags: [Vehicles]
 *     responses:
 *       200:
 *         description: A list of vehicles
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Vehicle'
 *       500:
 *         description: Server error
 */
router.get('/', vehicleController.getAllVehicles);

/**
 * @swagger
 * /vehicles/{id}:
 *   get:
 *     summary: Get a vehicle by ID
 *     description: Retrieve a single vehicle by ID
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
 *         description: A vehicle object
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Vehicle'
 *       404:
 *         description: Vehicle not found
 *       500:
 *         description: Server error
 */
router.get('/:id', vehicleController.getVehicleById);

/**
 * @swagger
 * /vehicles:
 *   post:
 *     summary: Create a new vehicle
 *     description: Create a new vehicle record
 *     tags: [Vehicles]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - plateNumber
 *               - type
 *               - capacity
 *               - length
 *               - width
 *               - height
 *               - fuelCapacity
 *               - currentFuel
 *             properties:
 *               plateNumber:
 *                 type: string
 *               type:
 *                 type: string
 *               capacity:
 *                 type: number
 *                 format: float
 *                 minimum: 0
 *               length:
 *                 type: number
 *                 format: float
 *                 minimum: 0
 *               width:
 *                 type: number
 *                 format: float
 *                 minimum: 0
 *               height:
 *                 type: number
 *                 format: float
 *                 minimum: 0
 *               fuelCapacity:
 *                 type: number
 *                 format: float
 *                 minimum: 0
 *               currentFuel:
 *                 type: number
 *                 format: float
 *                 minimum: 0
 *               features:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Vehicle created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Vehicle'
 *       400:
 *         description: Invalid request data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 */
const createVehicleValidation = [
  body('plateNumber').notEmpty().withMessage('Plate number is required'),
  body('type').notEmpty().withMessage('Vehicle type is required'),
  body('capacity').isFloat({ min: 0 }).withMessage('Capacity must be a positive number'),
  body('length').isFloat({ min: 0 }).withMessage('Length must be a positive number'),
  body('width').isFloat({ min: 0 }).withMessage('Width must be a positive number'),
  body('height').isFloat({ min: 0 }).withMessage('Height must be a positive number'),
  body('fuelCapacity').isFloat({ min: 0 }).withMessage('Fuel capacity must be a positive number'),
  body('currentFuel').isFloat({ min: 0 }).withMessage('Current fuel must be a positive number'),
  body('features').isArray().withMessage('Features must be an array'),
  validationMiddleware,
];
router.post('/', createVehicleValidation, vehicleController.createVehicle);

/**
 * @swagger
 * /vehicles/{id}:
 *   put:
 *     summary: Update a vehicle
 *     description: Update a vehicle record by ID
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
 *               plateNumber:
 *                 type: string
 *               type:
 *                 type: string
 *               capacity:
 *                 type: number
 *                 format: float
 *                 minimum: 0
 *               length:
 *                 type: number
 *                 format: float
 *                 minimum: 0
 *               width:
 *                 type: number
 *                 format: float
 *                 minimum: 0
 *               height:
 *                 type: number
 *                 format: float
 *                 minimum: 0
 *               fuelCapacity:
 *                 type: number
 *                 format: float
 *                 minimum: 0
 *               currentFuel:
 *                 type: number
 *                 format: float
 *                 minimum: 0
 *               features:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Vehicle updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Vehicle'
 *       400:
 *         description: Invalid request data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Vehicle not found
 *       500:
 *         description: Server error
 */
router.put('/:id', createVehicleValidation, vehicleController.updateVehicle);

/**
 * @swagger
 * /vehicles/{id}:
 *   delete:
 *     summary: Delete a vehicle
 *     description: Delete a vehicle record by ID
 *     tags: [Vehicles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Vehicle ID
 *     responses:
 *       204:
 *         description: Vehicle deleted successfully
 *       404:
 *         description: Vehicle not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', vehicleController.deleteVehicle);

/**
 * @swagger
 * /vehicles/{id}/location:
 *   get:
 *     summary: Get vehicle location
 *     description: Retrieve the current location of a vehicle
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
 *         description: Vehicle location
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 plateNumber:
 *                   type: string
 *                 location:
 *                   type: object
 *                   properties:
 *                     latitude:
 *                       type: number
 *                       format: float
 *                     longitude:
 *                       type: number
 *                       format: float
 *                     lastUpdated:
 *                       type: string
 *                       format: date-time
 *       404:
 *         description: Vehicle or location not found
 *       500:
 *         description: Server error
 */
router.get('/:id/location', vehicleController.getVehicleLocation);

/**
 * @swagger
 * /vehicles/{id}/location:
 *   put:
 *     summary: Update vehicle location
 *     description: Update the current location of a vehicle
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
 *               - latitude
 *               - longitude
 *             properties:
 *               latitude:
 *                 type: number
 *                 format: float
 *               longitude:
 *                 type: number
 *                 format: float
 *     responses:
 *       200:
 *         description: Vehicle location updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 plateNumber:
 *                   type: string
 *                 location:
 *                   type: object
 *                   properties:
 *                     latitude:
 *                       type: number
 *                       format: float
 *                     longitude:
 *                       type: number
 *                       format: float
 *                     lastUpdated:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Invalid location data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Vehicle not found
 *       500:
 *         description: Server error
 */
router.put('/:id/location', vehicleController.updateVehicleLocation);

/**
 * @swagger
 * /vehicles/{id}/status:
 *   put:
 *     summary: Update vehicle status
 *     description: Update the status of a vehicle (AVAILABLE, IN_USE, MAINTENANCE)
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
 *                 enum: [AVAILABLE, IN_USE, MAINTENANCE]
 *     responses:
 *       200:
 *         description: Vehicle status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Vehicle'
 *       400:
 *         description: Invalid status
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Vehicle not found
 *       500:
 *         description: Server error
 */
router.put('/:id/status', vehicleController.updateVehicleStatus);

export default router;