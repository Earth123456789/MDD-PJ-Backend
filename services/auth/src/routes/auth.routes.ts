import { Router } from "express";
import { register, login } from "../controllers/auth.controller";
import { publishMessage } from "../config/rabbitmq";
import { validate } from "../middleware/validate";
import { registerSchema, loginSchema } from "../validators/auth.validators";

const router = Router();

import passport from "passport";
import jwt from "jsonwebtoken";

// เริ่มต้น OAuth
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

// Callback จาก Google
router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: "/api/auth/google/fail",
  }),
  async (req, res) => {
    const user = req.user as any;

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: "1h" }
    );

    // ✅ ส่ง Event ไปที่ RabbitMQ
    try {
      await publishMessage("auth_service_events", {
        event: "USER_REGISTERED",
        data: {
          id: user.id,
          email: user.email,
          provider: "GOOGLE",
        },
      });
    } catch (error) {
      console.error("Error publishing Google login event:", error);
    }

    // ✅ ส่งกลับเป็น JSON
    res.json({
      message: "Google login successful",
      token,
      user: {
        id: user.id,
        email: user.email,
      },
    });
  }
);


// optional: ถ้า fail
router.get("/google/fail", (req, res) => {
  res.status(401).json({ message: "Google Login Failed" });
});


/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
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
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Invalid input or email already exists
 */
router.post("/register", validate(registerSchema), register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
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
 *         description: User logged in successfully
 *       400:
 *         description: Invalid credentials
 */
router.post("/login", validate(loginSchema), login);

/**
 * @swagger
 * /api/auth/send-event:
 *   post:
 *     summary: Send event to RabbitMQ
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
 *         description: Event sent to RabbitMQ
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
