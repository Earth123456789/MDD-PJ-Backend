import { Router } from "express";
import { register, login, refreshToken } from "../controllers/auth.controller";
import { publishMessage } from "../config/rabbitmq";
import { validate } from "../middleware/validate";
import { registerSchema, loginSchema, refreshTokenSchema } from "../validators/auth.validators";
import { authenticateJWT } from "../middleware/auth.middleware";

const router = Router();

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: ลงทะเบียนผู้ใช้ใหม่
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *               fullName:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [customer, driver, admin]
 *                 default: customer
 *     responses:
 *       201:
 *         description: ลงทะเบียนสำเร็จ
 *       400:
 *         description: ข้อมูลไม่ถูกต้องหรืออีเมลมีอยู่แล้ว
 */
router.post("/register", validate(registerSchema), register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: เข้าสู่ระบบ
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: เข้าสู่ระบบสำเร็จ
 *       400:
 *         description: ข้อมูลไม่ถูกต้อง
 */
router.post("/login", validate(loginSchema), login);

/**
 * @swagger
 * /api/auth/refresh-token:
 *   post:
 *     summary: ต่ออายุ JWT token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: ได้รับ token ใหม่
 *       401:
 *         description: Refresh token ไม่ถูกต้องหรือหมดอายุ
 */
router.post("/refresh-token", validate(refreshTokenSchema), refreshToken);

/**
 * @swagger
 * /api/auth/send-event:
 *   post:
 *     summary: ส่ง event ไปยัง RabbitMQ
 *     tags: [RabbitMQ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               event:
 *                 type: string
 *               data:
 *                 type: object
 *     responses:
 *       200:
 *         description: ส่ง event สำเร็จ
 */
router.post("/send-event", async (req, res) => {
  try {
    const { event, data } = req.body;

    if (!event || !data) {
      return res.status(400).json({ message: "Event and data are required" });
    }

    await publishMessage("auth_service_events", { event, data });

    res.status(200).json({ message: "Event sent successfully" });
  } catch (error) {
    console.error("Error sending event:", error);
    res.status(500).json({ message: "Failed to send event" });
  }
});

export default router;