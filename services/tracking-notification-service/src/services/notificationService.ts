// tracking-notification-service/src/services/notificationService.ts

import { PrismaClient } from "@prisma/client";
import { NotificationType } from "../types";
import { logger } from "../utils/logger";
import { publishMessage } from "../config/rabbitmq";
import { EmailService } from "./emailService";
import { UserCacheService } from "./userCacheService";

const prisma = new PrismaClient();
const emailService = new EmailService();
const userCacheService = new UserCacheService();

interface NotificationInput {
  user_id: number;
  title: string;
  message: string;
  type: NotificationType;
  order_id?: number;
  reference_id?: string;
  status?: string;
  newStatus?: string;
  oldStatus?: string;
  reason?: string;
  driverName?: string;
}

interface DeviceInput {
  user_id: number;
  device_token: string;
  device_type: "IOS" | "ANDROID" | "WEB";
}

export class NotificationService {
  /**
   * สร้างการแจ้งเตือนใหม่และส่งทางอีเมล (ไม่ใช้ UserDevice)
   */
  public async createNotification(data: NotificationInput): Promise<any> {
    try {
      // เก็บเฉพาะข้อมูลที่ใช้กับ Notification model
      const notificationData = {
        user_id: data.user_id,
        title: data.title,
        message: data.message,
        type: data.type,
        order_id: data.order_id,
        reference_id: data.reference_id,
      };

      // บันทึกการแจ้งเตือนในฐานข้อมูล
      const newNotification = await prisma.notification.create({
        data: notificationData
      });

      logger.info("Created new notification", {
        notificationId: newNotification.id,
        userId: data.user_id,
        type: data.type,
      });

      // ส่งอีเมลแจ้งเตือนถ้ามีข้อมูลออเดอร์
      if (data.order_id) {
        // เตรียมข้อมูลสำหรับการส่งอีเมล
        try {
          const orderData = {
            orderId: data.order_id,
            status: data.status || "updated",
            newStatus: data.newStatus, // ส่งค่า newStatus ไปด้วย
            oldStatus: data.oldStatus, // ส่งค่า oldStatus ไปด้วย
            description: data.message,
            timestamp: new Date().toISOString(),
            driverName: data.driverName, // ส่งชื่อคนขับ (ถ้ามี)
            reason: data.reason // ส่งเหตุผลการยกเลิก (ถ้ามี)
          };

          await this.sendEmailNotification(data, orderData);
        } catch (emailError) {
          logger.error("Error sending notification email:", emailError);
          // แม้ว่าการส่งอีเมลจะล้มเหลว ยังคงสร้างการแจ้งเตือนในระบบและไม่ throw error
        }
      }

      return newNotification;
    } catch (error) {
      logger.error("Error creating notification", error);
      throw error;
    }
  }

  /**
   * ดึงการแจ้งเตือนของผู้ใช้
   */
  public async getUserNotifications(
    userId: number,
    options: {
      page?: number;
      limit?: number;
      unreadOnly?: boolean;
    } = {}
  ): Promise<any> {
    try {
      const { page = 1, limit = 20, unreadOnly = false } = options;
      const skip = (page - 1) * limit;

      // เงื่อนไขในการค้นหา
      const where: any = { user_id: userId };
      if (unreadOnly) {
        where.read = false;
      }

      // ค้นหาการแจ้งเตือนและนับจำนวนทั้งหมด
      const [notifications, totalCount] = await Promise.all([
        prisma.notification.findMany({
          where,
          skip,
          take: limit,
          orderBy: { created_at: "desc" },
        }),
        prisma.notification.count({ where }),
      ]);

      const totalPages = Math.ceil(totalCount / limit);

      return {
        items: notifications,
        pagination: {
          total: totalCount,
          page,
          limit,
          totalPages,
        },
      };
    } catch (error) {
      logger.error("Error fetching user notifications", error);
      throw error;
    }
  }

  /**
   * อ่านการแจ้งเตือน
   */
  public async markNotificationAsRead(notificationId: number): Promise<any> {
    try {
      const updatedNotification = await prisma.notification.update({
        where: { id: notificationId },
        data: { read: true },
      });

      logger.info("Marked notification as read", { notificationId });

      return updatedNotification;
    } catch (error) {
      logger.error("Error marking notification as read", error);
      throw error;
    }
  }

  /**
   * อ่านการแจ้งเตือนทั้งหมดของผู้ใช้
   */
  public async markAllNotificationsAsRead(userId: number): Promise<number> {
    try {
      const result = await prisma.notification.updateMany({
        where: {
          user_id: userId,
          read: false,
        },
        data: { read: true },
      });

      logger.info("Marked all notifications as read", {
        userId,
        count: result.count,
      });

      return result.count;
    } catch (error) {
      logger.error("Error marking all notifications as read", error);
      throw error;
    }
  }

  /**
   * ส่งการแจ้งเตือนทางอีเมล
   */
  public async sendEmailNotification(
    data: NotificationInput,
    orderData: any
  ): Promise<boolean> {
    try {
      // ดึงข้อมูลผู้ใช้ (รวมถึง email) จาก user cache
      const userData = await userCacheService.getUserData(data.user_id);

      if (!userData || !userData.email) {
        logger.warn("Cannot send email notification: User email not found", {
          userId: data.user_id,
        });
        return false;
      }

      // ตรวจสอบว่าการตั้งค่าอีเมลถูกกำหนดหรือไม่
      if (
        !process.env.SMTP_USER ||
        process.env.SMTP_USER === "your-email@gmail.com"
      ) {
        logger.info(
          "Email SMTP configuration not set up properly, skipping email notification"
        );
        return false;
      }

      // สร้าง email และส่งไปยัง email ของผู้ใช้
      // ส่ง orderData ที่มีการปรับปรุงเพิ่มเติมข้อมูล newStatus, oldStatus ไปยัง emailService
      const emailHtml = emailService.createOrderUpdateEmailTemplate(
        orderData,
        userData
      );
      
      // สร้างหัวข้ออีเมลตามสถานะ
      let emailSubject = 'อัปเดตสถานะออเดอร์';
      if (orderData.newStatus) {
        switch(orderData.newStatus) {
          case 'confirmed':
            emailSubject = `ออเดอร์ #${data.order_id} ได้รับการยืนยันแล้ว`;
            break;
          case 'in_progress':
            emailSubject = `ออเดอร์ #${data.order_id} กำลังอยู่ระหว่างการจัดส่ง`;
            break;
          case 'arrived_at_dropoff':
            emailSubject = `คนขับถึงจุดส่งสินค้าสำหรับออเดอร์ #${data.order_id} แล้ว`;
            break;
          case 'completed':
            emailSubject = `ออเดอร์ #${data.order_id} จัดส่งสำเร็จแล้ว`;
            break;
          case 'cancelled':
            emailSubject = `ออเดอร์ #${data.order_id} ถูกยกเลิกแล้ว`;
            break;
          default:
            emailSubject = `อัปเดตสถานะออเดอร์ #${data.order_id}`;
        }
      } else if (data.status === 'matched') {
        emailSubject = `ออเดอร์ #${data.order_id} ได้รับการจับคู่กับคนขับแล้ว`;
      } else if (data.status === 'created') {
        emailSubject = `ออเดอร์ #${data.order_id} ได้รับการสร้างแล้ว`;
      }
      
      const emailSent = await emailService.sendEmail(
        userData.email, // ใช้ email ของผู้ใช้ที่ดึงมาจาก cache
        emailSubject,
        emailHtml
      );

      if (emailSent) {
        logger.info("Email notification sent", {
          userId: data.user_id,
          orderId: data.order_id,
          email: userData.email,
          status: orderData.newStatus || orderData.status
        });
      }

      return emailSent;
    } catch (error) {
      logger.error("Error sending email notification", error);
      return false;
    }
  }

  /**
   * ส่งอีเมลต้อนรับผู้ใช้ใหม่
   */
  public async sendWelcomeEmail(userData: any): Promise<boolean> {
    try {
      // ตรวจสอบว่ามีอีเมลหรือไม่
      if (!userData.email) {
        logger.warn("Cannot send welcome email: User email not found", {
          userId: userData.user_id,
        });
        return false;
      }

      // ตรวจสอบว่าการตั้งค่าอีเมลถูกกำหนดหรือไม่
      if (
        !process.env.SMTP_USER ||
        process.env.SMTP_USER === "your-email@gmail.com"
      ) {
        logger.info(
          "Email SMTP configuration not set up properly, skipping welcome email"
        );
        return false;
      }

      // สร้างเทมเพลตอีเมลต้อนรับ
      const emailHtml = emailService.createWelcomeEmailTemplate(userData);
      const emailSubject = "ยินดีต้อนรับสู่ระบบจัดส่งสินค้า";
      
      // ส่งอีเมล
      const emailSent = await emailService.sendEmail(
        userData.email,
        emailSubject,
        emailHtml
      );

      if (emailSent) {
        logger.info("Welcome email sent", {
          userId: userData.user_id,
          email: userData.email,
          role: userData.role
        });
      }

      return emailSent;
    } catch (error) {
      logger.error("Error sending welcome email", error);
      return false;
    }
  }

  /**
   * ส่งอีเมลต้อนรับคนขับใหม่
   */
  public async sendDriverWelcomeEmail(data: any): Promise<boolean> {
    try {
      // ดึงข้อมูลผู้ใช้ (รวมถึง email) จาก user cache
      const userData = await userCacheService.getUserData(data.user_id);

      if (!userData || !userData.email) {
        logger.warn("Cannot send driver welcome email: User email not found", {
          userId: data.user_id,
        });
        return false;
      }

      // ตรวจสอบว่าการตั้งค่าอีเมลถูกกำหนดหรือไม่
      if (
        !process.env.SMTP_USER ||
        process.env.SMTP_USER === "your-email@gmail.com"
      ) {
        logger.info(
          "Email SMTP configuration not set up properly, skipping driver welcome email"
        );
        return false;
      }

      // สร้างเทมเพลตอีเมลต้อนรับคนขับ
      const emailHtml = emailService.createDriverWelcomeEmailTemplate(userData, data);
      const emailSubject = "ยินดีต้อนรับคนขับใหม่สู่ระบบจัดส่งสินค้า";
      
      // ส่งอีเมล
      const emailSent = await emailService.sendEmail(
        userData.email,
        emailSubject,
        emailHtml
      );

      if (emailSent) {
        logger.info("Driver welcome email sent", {
          userId: data.user_id,
          driverId: data.driverId,
          email: userData.email
        });
      }

      return emailSent;
    } catch (error) {
      logger.error("Error sending driver welcome email", error);
      return false;
    }
  }
}