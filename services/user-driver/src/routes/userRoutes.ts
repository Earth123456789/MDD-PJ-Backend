// user-driver-service/src/routes/userRoutes.ts

import express from 'express';
import { UserController } from '../controllers/userController';
import { authMiddleware, roleMiddleware } from '../middlewares/authMiddleware';

const router = express.Router();
const userController = new UserController();

/**
 * @swagger
 * /users/me:
 *   get:
 *     summary: ดึงข้อมูลผู้ใช้ปัจจุบัน
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: ข้อมูลผู้ใช้
 *       401:
 *         description: ไม่ได้รับอนุญาต
 *       404:
 *         description: ไม่พบผู้ใช้
 *       500:
 *         description: ข้อผิดพลาดของเซิร์ฟเวอร์
 */
router.get('/me', authMiddleware, userController.getCurrentUser);

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: ดึงข้อมูลผู้ใช้ตาม ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: ข้อมูลผู้ใช้
 *       404:
 *         description: ไม่พบผู้ใช้
 *       500:
 *         description: ข้อผิดพลาดของเซิร์ฟเวอร์
 */
router.get('/:id', userController.getUserById);

/**
 * @swagger
 * /users/{id}:
 *   patch:
 *     summary: อัพเดทข้อมูลผู้ใช้
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               full_name:
 *                 type: string
 *               phone:
 *                 type: string
 *               avatar:
 *                 type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: อัพเดทข้อมูลผู้ใช้สำเร็จ
 *       400:
 *         description: ข้อมูลไม่ถูกต้อง
 *       401:
 *         description: ไม่ได้รับอนุญาต
 *       403:
 *         description: ไม่มีสิทธิ์เข้าถึง
 *       404:
 *         description: ไม่พบผู้ใช้
 *       500:
 *         description: ข้อผิดพลาดของเซิร์ฟเวอร์
 */
router.patch('/:id', authMiddleware, userController.updateUser);

/**
 * @swagger
 * /users:
 *   get:
 *     summary: ค้นหาผู้ใช้ (สำหรับแอดมินเท่านั้น)
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [customer, driver, admin]
 *         description: กรองตามบทบาทผู้ใช้
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *         description: คำค้นหา (อีเมล, ชื่อ, โทรศัพท์)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: หน้า
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: จำนวนรายการต่อหน้า
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: รายการผู้ใช้
 *       401:
 *         description: ไม่ได้รับอนุญาต
 *       403:
 *         description: ไม่มีสิทธิ์เข้าถึง
 *       500:
 *         description: ข้อผิดพลาดของเซิร์ฟเวอร์
 */
router.get('/', authMiddleware, roleMiddleware(['admin']), userController.searchUsers);

/**
 * @swagger
 * /users/{id}/change-password:
 *   post:
 *     summary: เปลี่ยนรหัสผ่าน (ถูกย้ายไป Auth Service)
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       405:
 *         description: ไม่รองรับการทำงานนี้ กรุณาใช้ Auth Service
 */
router.post('/:id/change-password', authMiddleware, userController.changePassword);

export default router;