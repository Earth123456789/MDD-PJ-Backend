import express from 'express';
import { body } from 'express-validator';
import * as assignmentController from '../controllers/assignment.controller';
import validationMiddleware from '../middleware/validation.middleware';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Assignments
 *   description: Assignment management APIs
 */

/**
 * @swagger
 * /assignments:
 *   get:
 *     summary: Get all assignments
 *     description: Retrieve a list of all driver-vehicle assignments
 *     tags: [Assignments]
 *     responses:
 *       200:
 *         description: A list of assignments
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Assignment'
 *       500:
 *         description: Server error
 */
router.get('/', assignmentController.getAllAssignments);

/**
 * @swagger
 * /assignments/{id}:
 *   get:
 *     summary: Get an assignment by ID
 *     description: Retrieve a single assignment by ID
 *     tags: [Assignments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Assignment ID
 *     responses:
 *       200:
 *         description: An assignment object
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Assignment'
 *       404:
 *         description: Assignment not found
 *       500:
 *         description: Server error
 */
router.get('/:id', assignmentController.getAssignmentById);

/**
 * @swagger
 * /assignments:
 *   post:
 *     summary: Create a new assignment
 *     description: Create a new driver-vehicle assignment
 *     tags: [Assignments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - driverId
 *               - vehicleId
 *             properties:
 *               driverId:
 *                 type: string
 *                 format: uuid
 *                 description: Driver ID
 *               vehicleId:
 *                 type: string
 *                 format: uuid
 *                 description: Vehicle ID
 *     responses:
 *       201:
 *         description: Assignment created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Assignment'
 *       400:
 *         description: Invalid request data or resource not available
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 */
const createAssignmentValidation = [
  body('driverId').notEmpty().withMessage('Driver ID is required'),
  body('vehicleId').notEmpty().withMessage('Vehicle ID is required'),
  validationMiddleware,
];
router.post('/', createAssignmentValidation, assignmentController.createAssignment);

/**
 * @swagger
 * /assignments/{id}:
 *   delete:
 *     summary: Delete an assignment
 *     description: Delete an assignment record by ID
 *     tags: [Assignments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Assignment ID
 *     responses:
 *       204:
 *         description: Assignment deleted successfully
 *       404:
 *         description: Assignment not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', assignmentController.deleteAssignment);

/**
 * @swagger
 * /assignments/{id}/status:
 *   put:
 *     summary: Update assignment status
 *     description: Update the status of an assignment (ACTIVE, COMPLETED, CANCELLED)
 *     tags: [Assignments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Assignment ID
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
 *                 enum: [ACTIVE, COMPLETED, CANCELLED]
 *     responses:
 *       200:
 *         description: Assignment status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Assignment'
 *       400:
 *         description: Invalid status
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Assignment not found
 *       500:
 *         description: Server error
 */
router.put('/:id/status', assignmentController.updateAssignmentStatus);

/**
 * @swagger
 * /assignments/driver/{driverId}:
 *   get:
 *     summary: Get assignments by driver
 *     description: Retrieve all assignments for a specific driver
 *     tags: [Assignments]
 *     parameters:
 *       - in: path
 *         name: driverId
 *         required: true
 *         schema:
 *           type: string
 *         description: Driver ID
 *     responses:
 *       200:
 *         description: A list of assignments
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Assignment'
 *       500:
 *         description: Server error
 */
router.get('/driver/:driverId', assignmentController.getAssignmentsByDriver);

/**
 * @swagger
 * /assignments/vehicle/{vehicleId}:
 *   get:
 *     summary: Get assignments by vehicle
 *     description: Retrieve all assignments for a specific vehicle
 *     tags: [Assignments]
 *     parameters:
 *       - in: path
 *         name: vehicleId
 *         required: true
 *         schema:
 *           type: string
 *         description: Vehicle ID
 *     responses:
 *       200:
 *         description: A list of assignments
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Assignment'
 *       500:
 *         description: Server error
 */
router.get('/vehicle/:vehicleId', assignmentController.getAssignmentsByVehicle);

export default router;