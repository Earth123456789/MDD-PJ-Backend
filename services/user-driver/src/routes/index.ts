import express from 'express';
import driverRoutes from './driverRoutes';

const router = express.Router();

// Base routes
router.get('/', (req, res) => {
  res.json({ message: 'Driver Service API is running' });
});

// Module routes - เหลือเพียง driver routes
router.use('/drivers', driverRoutes);

export default router;