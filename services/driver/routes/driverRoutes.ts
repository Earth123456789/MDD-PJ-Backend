import express from 'express';
import * as driverController from '../controllers/driverController';
import { validateDriverCreation, validateDriverUpdate, validateDriverId } from '../middlewares/validator';
import { authenticate } from '../middlewares/auth';

const router = express.Router();

// Public routes
router.post('/register', validateDriverCreation, driverController.registerDriver);
router.post('/login', driverController.loginDriver);

// Protected routes
router.use(authenticate);
router.get('/', driverController.getAllDrivers);
router.get('/available', driverController.getAvailableDrivers);
router.get('/:id', validateDriverId, driverController.getDriverById);
router.put('/:id', validateDriverId, validateDriverUpdate, driverController.updateDriver);
router.delete('/:id', validateDriverId, driverController.deleteDriver);
router.patch('/:id/status', validateDriverId, driverController.updateDriverStatus);
router.patch('/:id/location', validateDriverId, driverController.updateDriverLocation);
router.patch('/:id/availability', validateDriverId, driverController.updateDriverAvailability);
router.get('/nearby/:latitude/:longitude/:radius', driverController.getNearbyDrivers);

export default router;