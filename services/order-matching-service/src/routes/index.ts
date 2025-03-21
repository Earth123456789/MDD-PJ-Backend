// order-matching-service/src/routes/index.ts

import express from 'express';
import orderRoutes from './orderRoutes';
import matchingRoutes from './matchingRoutes';

const router = express.Router();

// Base route
router.get('/', (req, res) => {
  res.json({ message: 'Order & Matching Service API is running' });
});

// Module routes
router.use('/orders', orderRoutes);
router.use('/matching', matchingRoutes);

export default router;