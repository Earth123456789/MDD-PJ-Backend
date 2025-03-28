// src/routes/user.routes.ts
import { Router } from "express";
import { 
  getUserProfile, 
  getUserById, 
  updateUser, 
  searchUsers,
  getNotifications,
  markNotificationAsRead
} from "../controllers/user.controller";
import { authenticateJWT, authorizeRoles } from "../middleware/auth.middleware";

const router = Router();

/**
 * @swagger
 * /api/users/me:
 *   get:
 *     summary: ดึงข้อมูลผู้ใช้ปัจจุบัน
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: ข้อมูลผู้ใช้
 *       401:
 *         description: ไม่ได้รับอนุญาต
 *       404:
 *         description: ไม่พบผู้ใช้
 */
router.get("/me", authenticateJWT, getUserProfile);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: ดึงข้อมูลผู้ใช้ตาม ID
 *     tags: [User]
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
 */
router.get("/:id", authenticateJWT, getUserById);

/**
 * @swagger
 * /api/users/{id}:
 *   patch:
 *     summary: อัพเดทข้อมูลผู้ใช้
 *     tags: [User]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
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
 */
router.patch("/:id", authenticateJWT, updateUser);

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: ค้นหาผู้ใช้ (สำหรับแอดมินเท่านั้น)
 *     tags: [User]
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [customer, driver, admin]
 *         description: กรองตามบทบาทผู้ใช้
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: รายการผู้ใช้
 *       403:
 *         description: ไม่มีสิทธิ์เข้าถึง
 */
router.get("/", authenticateJWT, authorizeRoles("admin"), searchUsers);

/**
 * @swagger
 * /api/users/notifications:
 *   get:
 *     summary: ดึงข้อมูลการแจ้งเตือน
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: ข้อมูลการแจ้งเตือน
 */
router.get("/notifications", authenticateJWT, getNotifications);

/**
 * @swagger
 * /api/users/notifications/{notificationId}/read:
 *   post:
 *     summary: อ่านการแจ้งเตือน
 *     tags: [User]
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Notification ID
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: อ่านการแจ้งเตือนสำเร็จ
 */
router.post("/notifications/:notificationId/read", authenticateJWT, markNotificationAsRead);

export default router;