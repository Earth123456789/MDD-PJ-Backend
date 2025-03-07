import express from 'express';
import driverRoutes from './driverRoutes';

const router = express.Router();

router.use('/', driverRoutes);

export default router;