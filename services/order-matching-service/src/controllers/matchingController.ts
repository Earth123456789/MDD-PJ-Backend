// order-matching-service/src/controllers/matchingController.ts

import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import matchingService from '../services/matchingService';

export class MatchingController {
  /**
   * เริ่มกระบวนการจับคู่ออเดอร์กับรถ
   * @route POST /api/matching/:orderId/start
   */
  public async startMatching(req: Request, res: Response): Promise<void> {
    try {
      const { orderId } = req.params;

      // เริ่มกระบวนการจับคู่
      const result = await matchingService.startMatching(parseInt(orderId));

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error: any) {
      logger.error('Error starting matching process', error);

      if (error.message.includes('Order not found')) {
        res.status(404).json({
          success: false,
          message: 'Order not found'
        });
        return;
      }

      if (error.message.includes('Cannot match order')) {
        res.status(400).json({
          success: false,
          message: error.message
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'An error occurred while starting matching process'
      });
    }
  }

  /**
   * คนขับตอบรับการจับคู่
   * @route POST /api/matching/:matchingId/accept
   */
  public async acceptMatching(req: Request, res: Response): Promise<void> {
    try {
      const { matchingId } = req.params;

      // คนขับตอบรับการจับคู่
      const result = await matchingService.acceptMatching(parseInt(matchingId));

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error: any) {
      logger.error('Error accepting matching', error);

      if (error.message.includes('Matching not found')) {
        res.status(404).json({
          success: false,
          message: 'Matching not found'
        });
        return;
      }

      if (error.message.includes('Cannot accept matching')) {
        res.status(400).json({
          success: false,
          message: error.message
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'An error occurred while accepting matching'
      });
    }
  }

  /**
   * คนขับปฏิเสธการจับคู่
   * @route POST /api/matching/:matchingId/reject
   */
  public async rejectMatching(req: Request, res: Response): Promise<void> {
    try {
      const { matchingId } = req.params;
      const { reason } = req.body;

      // คนขับปฏิเสธการจับคู่
      const result = await matchingService.rejectMatching(parseInt(matchingId), reason);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error: any) {
      logger.error('Error rejecting matching', error);

      if (error.message.includes('Matching not found')) {
        res.status(404).json({
          success: false,
          message: 'Matching not found'
        });
        return;
      }

      if (error.message.includes('Cannot reject matching')) {
        res.status(400).json({
          success: false,
          message: error.message
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'An error occurred while rejecting matching'
      });
    }
  }
}