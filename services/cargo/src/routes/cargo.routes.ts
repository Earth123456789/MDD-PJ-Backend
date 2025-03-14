import express from 'express';
import { createCargo, updateCargo, deleteCargo } from '../controllers/cargo.controller';

const router = express.Router();

// 📌 เพิ่ม Cargo ใหม่
router.post('/', createCargo);

// 📌 อัปเดต Cargo ตาม cargo_id
router.put('/:id', updateCargo);

// 📌 ลบ Cargo ตาม cargo_id
router.delete('/:id', deleteCargo);

export default router;
