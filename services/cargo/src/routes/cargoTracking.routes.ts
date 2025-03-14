import express from 'express';
import { getCargoTracking, addCargoTracking, updateCargoTracking } from '../controllers/cargoTracking.controller';

const router = express.Router();

// // ดึงข้อมูลการติดตามของ Cargo
// router.get('/:id/tracking', getCargoTracking);

// เพิ่มข้อมูลการติดตามของ Cargo
router.post('/:id/tracking', addCargoTracking);

// อัปเดตข้อมูลการติดตามของ Cargo
router.put('/:id/tracking/:trackingId', updateCargoTracking);

export default router;
