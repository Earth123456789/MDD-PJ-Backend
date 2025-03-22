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
    const { email, password } = req.body;

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
      },
    });

    logger.info(`User registered successfully: ${email}`);

    // ส่ง Event ไปยัง RabbitMQ
    await publishMessage("user_events", {
      event: "USER_REGISTERED",
      data: {
        id: user.id,
        email: user.email,
        provider: user.provider,
        createdAt: user.createdAt,
      },
    });

    res.status(201).json({ message: "User registered successfully", user });
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
      { id: user.id, email: user.email },
      process.env.JWT_SECRET as string,
      { expiresIn: "1h" }
    );

    const refreshToken = jwt.sign(
      { id: user.id },
      process.env.JWT_REFRESH_SECRET as string,
      { expiresIn: "7d" }
    );

    await prisma.authToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 วัน
      },
    });

    await publishMessage("user_events", {
      event: "USER_LOGGED_IN",
      data: {
        id: user.id,
        email: user.email,
        loginTime: new Date(),
      },
    });

    res.json({ token, refreshToken });
  } catch (error) {
    logger.error("Error during login: " + error);
    res.status(500).json({ message: "Server error" });
  }
};
