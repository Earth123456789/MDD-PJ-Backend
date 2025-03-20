import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { logger } from "../utils/logger";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
export { prisma };

// ✅ Register Controller
export const register = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    logger.info(`Received registration request for ${email}`);

    // ✅ ตรวจสอบว่าอีเมลถูกใช้ไปแล้วหรือไม่
    const existingUser = await prisma.authUser.findUnique({ where: { email } });
    if (existingUser) {
      logger.warn(`Registration failed: Email ${email} already exists`);
      return res.status(400).json({ message: "Email already exists" });
    }

    // ✅ เข้ารหัสรหัสผ่าน
    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ บันทึกลงฐานข้อมูล
    const user = await prisma.authUser.create({
      data: { email, password: hashedPassword, provider: "LOCAL" },
    });

    logger.info(`User registered successfully: ${email}`);
    res.status(201).json({ message: "User registered successfully", user });
  } catch (error) {
    logger.error("Error during registration: " + error);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Login Controller
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // ✅ ค้นหาผู้ใช้ในฐานข้อมูล
    const user = await prisma.authUser.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // ✅ ตรวจสอบรหัสผ่าน
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // ✅ สร้าง JWT Token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET as string,
      { expiresIn: "1h" }
    );

    // ✅ บันทึก Refresh Token ลง Database
    const refreshToken = jwt.sign(
      { id: user.id },
      process.env.JWT_REFRESH_SECRET as string,
      { expiresIn: "7d" }
    );

    await prisma.authToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    res.json({ token, refreshToken });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};
