import express from "express";
import { body } from "express-validator";
import * as driverController from "../controllers/driver.controller";
import validationMiddleware from "../middleware/validation.middleware";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Drivers
 *   description: Driver management APIs
 */

/**
 * @swagger
 * /drivers:
 *   get:
 *     summary: Get all drivers
 *     description: Retrieve a list of all drivers
 *     tags: [Drivers]
 *     responses:
 *       200:
 *         description: A list of drivers
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Driver'
 *       500:
 *         description: Server error
 */
router.get("/", driverController.getAllDrivers);

/**
 * @swagger
 * /drivers/{id}:
 *   get:
 *     summary: Get a driver by ID
 *     description: Retrieve a single driver by ID
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
 *         description: A driver object
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Driver'
 *       404:
 *         description: Driver not found
 *       500:
 *         description: Server error
 */
router.get("/:id", driverController.getDriverById);

/**
 * @swagger
 * /drivers:
 *   post:
 *     summary: Create a new driver
 *     description: Create a new driver record
 *     tags: [Drivers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - phone
 *               - licenseNumber
 *               - licenseType
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *               licenseNumber:
 *                 type: string
 *               licenseType:
 *                 type: string
 *               preferredVehicleTypes:
 *                 type: array
 *                 items:
 *                   type: string
 *               experience:
 *                 type: integer
 *                 minimum: 0
 *     responses:
 *       201:
 *         description: Driver created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Driver'
 *       400:
 *         description: Invalid request data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 */
const createDriverValidation = [
  body("name").notEmpty().withMessage("Name is required"),
  body("phone").notEmpty().withMessage("Phone is required"),
  body("licenseNumber").notEmpty().withMessage("License number is required"),
  body("licenseType").notEmpty().withMessage("License type is required"),
  body("preferredVehicleTypes")
    .isArray()
    .withMessage("Preferred vehicle types must be an array"),
  body("experience")
    .isInt({ min: 0 })
    .withMessage("Experience must be a positive integer"),
  validationMiddleware,
];
router.post("/", createDriverValidation, driverController.createDriver);

/**
 * @swagger
 * /drivers/{id}:
 *   put:
 *     summary: Update a driver
 *     description: Update a driver record by ID
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
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *               licenseNumber:
 *                 type: string
 *               licenseType:
 *                 type: string
 *               preferredVehicleTypes:
 *                 type: array
 *                 items:
 *                   type: string
 *               experience:
 *                 type: integer
 *                 minimum: 0
 *     responses:
 *       200:
 *         description: Driver updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Driver'
 *       400:
 *         description: Invalid request data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Driver not found
 *       500:
 *         description: Server error
 */
router.put("/:id", createDriverValidation, driverController.updateDriver);

/**
 * @swagger
 * /drivers/{id}:
 *   delete:
 *     summary: Delete a driver
 *     description: Delete a driver record by ID
 *     tags: [Drivers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Driver ID
 *     responses:
 *       204:
 *         description: Driver deleted successfully
 *       404:
 *         description: Driver not found
 *       500:
 *         description: Server error
 */
router.delete("/:id", driverController.deleteDriver);

/**
 * @swagger
 * /drivers/{id}/location:
 *   get:
 *     summary: Get driver location
 *     description: Retrieve the current location of a driver
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
 *         description: Driver location
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 name:
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
 *         description: Driver or location not found
 *       500:
 *         description: Server error
 */
router.get("/:id/location", driverController.getDriverLocation);

/**
 * @swagger
 * /drivers/{id}/location:
 *   put:
 *     summary: Update driver location
 *     description: Update the current location of a driver
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
 *                 format: float
 *               longitude:
 *                 type: number
 *                 format: float
 *     responses:
 *       200:
 *         description: Driver location updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 name:
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
 *         description: Driver not found
 *       500:
 *         description: Server error
 */
router.put("/:id/location", driverController.updateDriverLocation);

/**
 * @swagger
 * /drivers/{id}/status:
 *   put:
 *     summary: Update driver status
 *     description: Update the status of a driver (AVAILABLE, BUSY, OFFLINE)
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
 *                 enum: [AVAILABLE, BUSY, OFFLINE]
 *     responses:
 *       200:
 *         description: Driver status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Driver'
 *       400:
 *         description: Invalid status
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Driver not found
 *       500:
 *         description: Server error
 */
router.put("/:id/status", driverController.updateDriverStatus);

export default router;
