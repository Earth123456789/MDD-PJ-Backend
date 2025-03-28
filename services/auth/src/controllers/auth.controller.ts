import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { logger } from "../utils/logger";
import { PrismaClient, AuthProvider } from "@prisma/client";
import { publishMessage } from "../config/rabbitmq";

const prisma = new PrismaClient();
export { prisma };

// ✅ Register
export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, role = "customer", fullName, phone } = req.body;

    logger.info(`Received registration request for ${email}`);

    const existingUser = await prisma.authUser.findUnique({ where: { email } });
    if (existingUser) {
      logger.warn(`Registration failed: Email ${email} already exists`);
      return res.status(400).json({ message: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.authUser.create({
      data: {
        email,
        password: hashedPassword,
        provider: AuthProvider.LOCAL,
        fullName: fullName, 
        phone: phone,
        role: role
      },
    });

    logger.info(`User registered successfully: ${email}`);

    // สร้าง token เพื่อให้สามารถล็อกอินได้ทันที
    const token = jwt.sign(
      { id: user.id, email: user.email, role },
      process.env.JWT_SECRET as string,
      { expiresIn: "1h" },
    );

    const refreshToken = jwt.sign(
      { id: user.id },
      process.env.JWT_REFRESH_SECRET as string,
      { expiresIn: "7d" },
    );

    await prisma.authToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 วัน
      },
    });

    console.log("Data being sent to RabbitMQ:", {
      event: "USER_REGISTERED",
      data: { id: user.id, email: user.email, fullName: fullName }
    });

    // ส่ง Event ไปยัง RabbitMQ
    await publishMessage("auth_service_events", {
      event: "USER_REGISTERED",
      data: {
        id: user.id,
        email: user.email,
        provider: user.provider,
        role: role,
        fullName: fullName,
        phone: phone,
        createdAt: user.createdAt,
      },
    });

    // ส่งข้อมูลผู้ใช้กลับไป
    const userData = {
      id: user.id,
      email: user.email,
      role: user.role,
      data: {
        full_name: fullName,
        phone: phone,
        avatar: null,
        notifications: 0
      }
    };

    res.status(201).json({ 
      message: "User registered successfully", 
      token,
      refreshToken,
      user: userData 
    });
  } catch (error) {
    logger.error("Error during registration: " + error);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Login
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.authUser.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: "1h" },
    );

    const refreshToken = jwt.sign(
      { id: user.id },
      process.env.JWT_REFRESH_SECRET as string,
      { expiresIn: "7d" },
    );

    await prisma.authToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 วัน
      },
    });

    await publishMessage("auth_service_events", {
      event: "USER_LOGGED_IN",
      data: {
        id: user.id,
        email: user.email,
        role: user.role,
        loginTime: new Date(),
      },
    });

    // นับการแจ้งเตือนที่ยังไม่อ่าน
    const unreadNotifications = await prisma.notification.count({
      where: {
        userId: user.id,
        isRead: false
      }
    });

    // ส่งข้อมูลผู้ใช้ในการตอบกลับ
    const userData = {
      id: user.id,
      email: user.email,
      role: user.role,
      data: {
        full_name: user.fullName || "",
        phone: user.phone || null,
        avatar: user.avatar || null,
        notifications: unreadNotifications
      }
    };

    res.json({ 
      token, 
      refreshToken,
      user: userData 
    });
  } catch (error) {
    logger.error("Error during login: " + error);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Refresh Token
export const refreshToken = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ message: "Refresh token is required" });
    }

    // ตรวจสอบความถูกต้องของ refresh token
    let decoded;
    try {
      decoded = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET as string
      ) as any;
    } catch (error) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    // ค้นหา token ในฐานข้อมูล
    const storedToken = await prisma.authToken.findFirst({
      where: {
        userId: decoded.id,
        token: refreshToken,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!storedToken) {
      return res.status(401).json({ message: "Refresh token not found or expired" });
    }

    // ดึงข้อมูลผู้ใช้
    const user = await prisma.authUser.findUnique({
      where: { id: decoded.id },
    });

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // สร้าง token ใหม่
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: "1h" }
    );

    res.json({ token });
  } catch (error) {
    logger.error("Error refreshing token: " + error);
    res.status(500).json({ message: "Server error" });
  }
};