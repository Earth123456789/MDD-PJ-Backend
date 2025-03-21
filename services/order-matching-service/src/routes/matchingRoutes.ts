// order-matching-service/src/routes/matchingRoutes.ts

import express from 'express';
import { MatchingController } from '../controllers/matchingController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = express.Router();
const matchingController = new MatchingController();

/**
 * @swagger
 * /matching/{orderId}/start:
 *   post:
 *     summary: Start matching process for an order
 *     tags: [Matching]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Matching process started successfully
 *       400:
 *         description: Order cannot be matched in current state
 *       404:
 *         description: Order not found
 *       500:
 *         description: Server error
 */
router.post('/:orderId/start', authMiddleware, matchingController.startMatching);

/**
 * @swagger
 * /matching/{matchingId}/accept:
 *   post:
 *     summary: Driver accepts matching request
 *     tags: [Matching]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: matchingId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Matching ID
 *     responses:
 *       200:
 *         description: Matching accepted successfully
 *       400:
 *         description: Matching cannot be accepted in current state
 *       404:
 *         description: Matching not found
 *       500:
 *         description: Server error
 */
router.post('/:matchingId/accept', authMiddleware, matchingController.acceptMatching);

/**
 * @swagger
 * /matching/{matchingId}/reject:
 *   post:
 *     summary: Driver rejects matching request
 *     tags: [Matching]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: matchingId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Matching ID
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
 *         description: Matching rejected successfully
 *       400:
 *         description: Matching cannot be rejected in current state
 *       404:
 *         description: Matching not found
 *       500:
 *         description: Server error
 */
router.post('/:matchingId/reject', authMiddleware, matchingController.rejectMatching);

export default router;