// routes/driverRoutes.js - เส้นทาง API สำหรับบริการคนขับ

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const driverController = require('../controllers/driverController');
const { authenticateDriver } = require('../middleware/authMiddleware');

// เส้นทางสำหรับการลงทะเบียน
router.post('/register', [
  body('firstName').notEmpty().withMessage('ต้องระบุชื่อ'),
  body('lastName').notEmpty().withMessage('ต้องระบุนามสกุล'),
  body('phone').notEmpty().withMessage('ต้องระบุเบอร์โทรศัพท์'),
  body('email').isEmail().withMessage('ต้องระบุอีเมลที่ถูกต้อง'),
  body('password').isLength({ min: 6 }).withMessage('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'),
  body('licenseNumber').notEmpty().withMessage('ต้องระบุเลขที่ใบอนุญาต'),
  body('licenseType').notEmpty().withMessage('ต้องระบุประเภทใบอนุญาต'),
  body('licenseExpiry').isISO8601().toDate().withMessage('ต้องระบุวันหมดอายุใบอนุญาตที่ถูกต้อง'),
  body('vehicleType').notEmpty().withMessage('ต้องระบุประเภทยานพาหนะ'),
  body('vehicleRegistration').notEmpty().withMessage('ต้องระบุทะเบียนยานพาหนะ'),
  body('vehicleCapacity').isNumeric().withMessage('ความจุยานพาหนะต้องเป็นตัวเลข')
], driverController.registerDriver);

// เส้นทางสำหรับการเข้าสู่ระบบ
router.post('/login', [
  body('email').isEmail().withMessage('ต้องระบุอีเมลที่ถูกต้อง'),
  body('password').notEmpty().withMessage('ต้องระบุรหัสผ่าน')
], driverController.loginDriver);

// อัปเดตตำแหน่งคนขับ
router.post('/update-location', authenticateDriver, [
  body('latitude').isNumeric().withMessage('ต้องระบุละติจูดที่ถูกต้อง'),
  body('longitude').isNumeric().withMessage('ต้องระบุลองจิจูดที่ถูกต้อง'),
  body('status').optional().isIn(['available', 'busy', 'offline', 'on_delivery']).withMessage('สถานะไม่ถูกต้อง')
], driverController.updateLocation);

// ค้นหาคนขับใกล้เคียง
router.get('/nearby', [
  body('latitude').isNumeric().withMessage('ต้องระบุละติจูดที่ถูกต้อง'),
  body('longitude').isNumeric().withMessage('ต้องระบุลองจิจูดที่ถูกต้อง'),
  body('radius').optional().isNumeric().withMessage('รัศมีต้องเป็นตัวเลข'),
  body('vehicleType').optional().isString().withMessage('ประเภทยานพาหนะต้องเป็นข้อความ')
], driverController.getNearbyDrivers);

// ตอบรับหรือปฏิเสธการขนส่ง
router.post('/delivery-response', authenticateDriver, [
  body('orderId').notEmpty().withMessage('ต้องระบุ ID ของคำสั่ง'),
  body('accept').isBoolean().withMessage('การตอบรับต้องเป็นค่าบูลีน')
], driverController.deliveryResponse);

// เสร็จสิ้นการขนส่ง
router.post('/complete-delivery', authenticateDriver, [
  body('orderId').notEmpty().withMessage('ต้องระบุ ID ของคำสั่ง'),
  body('deliveryProof').optional().isString().withMessage('หลักฐานการส่งมอบต้องเป็นข้อความ (URL ไปยังรูปภาพ)')
], driverController.completeDelivery);

// ดูโปรไฟล์คนขับ
router.get('/profile', authenticateDriver, driverController.getProfile);

// อัปเดตโปรไฟล์คนขับ
router.put('/profile', authenticateDriver, driverController.updateProfile);

// ดูประวัติคำสั่งของคนขับ (ตัวอย่าง)
router.get('/order-history', authenticateDriver, (req, res) => {
  res.json({ message: 'ฟีเจอร์ที่จะพัฒนาในอนาคต - จะแสดงประวัติคำสั่ง' });
});

module.exports = router;