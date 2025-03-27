// tracking-notification-service/src/routes/index.ts

import express from 'express';
import notificationRoutes from './notificationRoutes';

const router = express.Router();

// Base routes
router.get('/', (req, res) => {
  res.json({ message: 'Tracking & Notification Service API is running' });
});

// Module routes
router.use('/notifications', notificationRoutes);

export default router;