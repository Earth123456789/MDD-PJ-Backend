import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { publishMessage } from "../config/rabbitmq";
import { logger } from "../utils/logger";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
export { prisma };


const JWT_SECRET: string = process.env.JWT_SECRET as string;
const JWT_EXPIRES_IN = 3600;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined in .env file");
}

/**
 * ลงทะเบียนผู้ใช้ใหม่
 */
export const registerUser = async (email: string, password: string) => {
  try {
    logger.info(`Attempting to register user: ${email}`);

    // ตรวจสอบว่ามีบัญชีอยู่แล้วหรือไม่
    const existingUser = await prisma.authUser.findUnique({ where: { email } });
    if (existingUser) {
      logger.warn(`Registration failed: Email ${email} already exists`);
      throw new Error("Email already exists");
    }

    // เข้ารหัสรหัสผ่าน
    const hashedPassword = await bcrypt.hash(password, 10);

    // สร้างบัญชีผู้ใช้ใหม่
    const user = await prisma.authUser.create({
      data: { email, password: hashedPassword, provider: "LOCAL" },
    });

    logger.info(`User registered successfully: ${email}`);

    // ส่ง Event ไปที่ RabbitMQ ว่ามีการลงทะเบียนใหม่
    await publishMessage("user_events", {
      event: "USER_REGISTERED",
      data: { userId: user.id, email: user.email },
    });

    return user;
  } catch (error) {
    logger.error("Error registering user:", error);
    throw error;
  }
};

/**
 * เข้าสู่ระบบและสร้าง JWT Token
 */
export const loginUser = async (email: string, password: string) => {
    try {
      logger.info(`Attempting to log in user: ${email}`);
  
      // ตรวจสอบว่าผู้ใช้มีอยู่ในระบบหรือไม่
      const user = await prisma.authUser.findUnique({ where: { email } });
      if (!user) {
        logger.warn(`Login failed: User with email ${email} not found`);
        throw new Error("Invalid email or password");
      }
  
      // ตรวจสอบรหัสผ่าน
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        logger.warn(`Login failed: Invalid password for user ${email}`);
        throw new Error("Invalid email or password");
      }
  
      // ✅ สร้าง JWT Token โดยแน่ใจว่ามีค่า `JWT_SECRET`
      const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN,
      });
  
      logger.info(`User logged in successfully: ${email}`);
  
      return { token, userId: user.id };
    } catch (error) {
      logger.error("Error logging in user:", error);
      throw error;
    }
  };
