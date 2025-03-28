// src/controllers/user.controller.ts
import { Request, Response } from "express";
import { logger } from "../utils/logger";
import { PrismaClient } from "@prisma/client";
import { publishMessage } from "../config/rabbitmq";

const prisma = new PrismaClient();

// ดึงข้อมูลผู้ใช้ปัจจุบัน
export const getUserProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    
    const user = await prisma.authUser.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        avatar: true,
        provider: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // นับจำนวนการแจ้งเตือนที่ยังไม่อ่าน
    const unreadNotifications = await prisma.notification.count({
      where: {
        userId: userId,
        isRead: false
      }
    });

    // จัดรูปแบบข้อมูลเพื่อส่งกลับ
    const userData = {
      id: user.id,
      email: user.email,
      role: user.role,
      data: {
        full_name: user.fullName || "",
        phone: user.phone || "",
        avatar: user.avatar || null,
        notifications: unreadNotifications
      }
    };

    res.json(userData);
  } catch (error) {
    logger.error("Error fetching user profile: " + error);
    res.status(500).json({ message: "Server error" });
  }
};

// ดึงข้อมูลผู้ใช้ตาม ID
export const getUserById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const user = await prisma.authUser.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true, 
        avatar: true,
        provider: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // นับจำนวนการแจ้งเตือนที่ยังไม่อ่าน
    const unreadNotifications = await prisma.notification.count({
      where: {
        userId: id,
        isRead: false
      }
    });

    // จัดรูปแบบข้อมูลเพื่อส่งกลับ
    const userData = {
      id: user.id,
      email: user.email,
      role: user.role,
      data: {
        full_name: user.fullName || "",
        phone: user.phone || "",
        avatar: user.avatar || null,
        notifications: unreadNotifications
      }
    };

    res.json(userData);
  } catch (error) {
    logger.error("Error fetching user by ID: " + error);
    res.status(500).json({ message: "Server error" });
  }
};

// อัพเดทข้อมูลผู้ใช้
export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { fullName, phone, avatar } = req.body;
    
    // ตรวจสอบสิทธิ์ - ผู้ใช้ต้องอัพเดทข้อมูลตัวเองเท่านั้น หรือเป็นแอดมิน
    const currentUserId = (req as any).user.id;
    const userRole = (req as any).user.role;
    
    if (currentUserId !== id && userRole !== "admin") {
      return res.status(403).json({ message: "You can only update your own profile" });
    }

    // ตรวจสอบว่ามีข้อมูลที่จะอัพเดทหรือไม่
    if (!fullName && !phone && !avatar) {
      return res.status(400).json({ message: "No data to update" });
    }

    // สร้างข้อมูลสำหรับอัพเดท
    const updateData: any = {};
    if (fullName) updateData.fullName = fullName;
    if (phone) updateData.phone = phone;
    if (avatar) updateData.avatar = avatar;

    // อัพเดทข้อมูลผู้ใช้
    const updatedUser = await prisma.authUser.update({
      where: { id },
      data: updateData,
    });

    // ส่ง Event อัพเดทข้อมูลผู้ใช้ไปยัง RabbitMQ
    await publishMessage("auth_service_events", {
      event: "USER_PROFILE_UPDATED",
      data: {
        id: updatedUser.id,
        email: updatedUser.email,
        fullName: updatedUser.fullName,
        phone: updatedUser.phone,
        avatar: updatedUser.avatar,
        role: updatedUser.role,
        updatedAt: new Date(),
      },
    });

    // นับจำนวนการแจ้งเตือนที่ยังไม่อ่าน
    const unreadNotifications = await prisma.notification.count({
      where: {
        userId: id,
        isRead: false
      }
    });

    // จัดรูปแบบข้อมูลเพื่อส่งกลับ
    const userData = {
      id: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role,
      data: {
        full_name: updatedUser.fullName || "",
        phone: updatedUser.phone || "",
        avatar: updatedUser.avatar || null,
        notifications: unreadNotifications
      }
    };

    res.json(userData);
  } catch (error) {
    logger.error("Error updating user: " + error);
    res.status(500).json({ message: "Server error" });
  }
};

// ค้นหาผู้ใช้ (สำหรับแอดมินเท่านั้น)
export const searchUsers = async (req: Request, res: Response) => {
  try {
    const { role, query, page = "1", limit = "10" } = req.query;
    
    // ตรวจสอบว่าผู้ใช้เป็นแอดมินหรือไม่
    const userRole = (req as any).user.role;
    if (userRole !== "admin") {
      return res.status(403).json({ message: "Only admin can search users" });
    }

    // สร้างเงื่อนไขในการค้นหา
    const where: any = {};
    
    if (role) {
      where.role = role;
    }
    
    if (query) {
      where.OR = [
        { email: { contains: query as string, mode: "insensitive" } },
        { fullName: { contains: query as string, mode: "insensitive" } },
        { phone: { contains: query as string } },
      ];
    }

    // ค้นหาและนับจำนวนผู้ใช้
    const [users, totalCount] = await Promise.all([
      prisma.authUser.findMany({
        where,
        select: {
          id: true,
          email: true,
          fullName: true,
          phone: true,
          avatar: true,
          role: true,
          provider: true,
          createdAt: true,
        },
        skip: (parseInt(page as string) - 1) * parseInt(limit as string),
        take: parseInt(limit as string),
        orderBy: { createdAt: "desc" },
      }),
      prisma.authUser.count({ where }),
    ]);

    // จัดรูปแบบข้อมูลเพื่อส่งกลับ
    const formattedUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      role: user.role,
      provider: user.provider,
      createdAt: user.createdAt,
      data: {
        full_name: user.fullName || "",
        phone: user.phone || "",
        avatar: user.avatar || null
      }
    }));

    // คำนวณจำนวนหน้าทั้งหมด
    const totalPages = Math.ceil(totalCount / parseInt(limit as string));

    res.json({
      items: formattedUsers,
      pagination: {
        total: totalCount,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        totalPages,
      },
    });
  } catch (error) {
    logger.error("Error searching users: " + error);
    res.status(500).json({ message: "Server error" });
  }
};

// API สำหรับการจัดการการแจ้งเตือน
export const getNotifications = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { page = "1", limit = "10" } = req.query;
    
    const [notifications, totalCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        skip: (parseInt(page as string) - 1) * parseInt(limit as string),
        take: parseInt(limit as string),
      }),
      prisma.notification.count({ where: { userId } }),
    ]);
    
    const totalPages = Math.ceil(totalCount / parseInt(limit as string));
    
    res.json({
      items: notifications,
      pagination: {
        total: totalCount,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        totalPages,
      },
    });
  } catch (error) {
    logger.error("Error fetching notifications: " + error);
    res.status(500).json({ message: "Server error" });
  }
};

// API สำหรับการอ่านการแจ้งเตือน
export const markNotificationAsRead = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { notificationId } = req.params;
    
    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });
    
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }
    
    await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
    
    res.json({ message: "Notification marked as read" });
  } catch (error) {
    logger.error("Error marking notification as read: " + error);
    res.status(500).json({ message: "Server error" });
  }
};