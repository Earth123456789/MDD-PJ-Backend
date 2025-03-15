
import express from 'express';
import userRoutes from './userRoutes';
import driverRoutes from './driverRoutes';
import vehicleRoutes from './vehicleRoutes';

const router = express.Router();

// Base routes
router.get('/', (req, res) => {
  res.json({ message: 'User & Driver Service API is running' });
});

// Module routes
router.use('/users', userRoutes);
router.use('/drivers', driverRoutes);
router.use('/vehicles', vehicleRoutes);

export default router;