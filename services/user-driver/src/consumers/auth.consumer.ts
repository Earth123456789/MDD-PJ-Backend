// user-driver-service/src/consumers/auth.consumer.ts

import { consumeMessages, getChannel } from '../config/rabbitmq';
import { logger } from '../utils/logger';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:5001';

export const setupAuthConsumer = async (): Promise<void> => {
  try {
    // ตรวจสอบว่า queue มีอยู่หรือไม่
    const queueName = 'auth_service_events';
    
    // ดึง channel และประกาศ queue อีกครั้งเพื่อความมั่นใจ
    const channel = getChannel();
    if (channel) {
      await channel.assertQueue(queueName, { 
        durable: true,
        autoDelete: false,
        exclusive: false
      });
    }
    
    await consumeMessages(queueName, async (message) => {
      logger.info(`รับ Auth Event: ${message.event}`, { data: JSON.stringify(message.data) });
      
      switch (message.event) {
        case 'USER_REGISTERED':
          await handleUserRegistered(message.data);
          break;

        case 'USER_LOGGED_IN':
          await handleUserLoggedIn(message.data);
          break;
          
        case 'USER_PROFILE_UPDATED':
          await handleUserProfileUpdated(message.data);
          break;

        default:
          logger.warn(`ไม่มีการจัดการ Auth Event: ${message.event}`);
      }
    });
    
    logger.info(`เริ่มต้นการบริโภค Auth Event จาก queue: ${queueName}`);
  } catch (error) {
    logger.error('เกิดข้อผิดพลาดในการบริโภค auth events:', error);
  }
};

const handleUserRegistered = async (data: any): Promise<void> => {
  try {
    console.log("Received USER_REGISTERED data:", data);
    
    const { id, email, provider, role, fullName, phone } = data;
    
    if (!id || !email) {
      logger.warn('ข้อมูล USER_REGISTERED ไม่สมบูรณ์:', data);
      return;
    }

    // ถ้าเป็นคนขับ ให้สร้างข้อมูลคนขับด้วย (ในขั้นต้น)
    if (role === 'driver') {
      // ตรวจสอบว่ามีข้อมูลคนขับอยู่แล้วหรือไม่
      const existingDriver = await prisma.driver.findUnique({
        where: { user_id: id }
      });
      
      if (!existingDriver) {
        // สร้างข้อมูลคนขับใหม่
        await prisma.driver.create({
          data: {
            user_id: id,
            license_number: '', // ต้องให้ผู้ใช้อัปเดตข้อมูลต่อ
            id_card_number: '', // ต้องให้ผู้ใช้อัปเดตข้อมูลต่อ
            status: 'inactive',
            rating: 0,
          },
        });
        
        logger.info(`สร้างข้อมูลคนขับเบื้องต้นสำหรับ: ${email}`);
      }
    }
  } catch (error) {
    logger.error('เกิดข้อผิดพลาดในการจัดการ USER_REGISTERED:', error);
  }
};

const handleUserLoggedIn = async (data: any): Promise<void> => {
  try {
    const { id, email, loginTime, role } = data;

    if (!id || !email) {
      logger.warn('ข้อมูล USER_LOGGED_IN ไม่สมบูรณ์:', data);
      return;
    }

    // ตรวจสอบว่ามีข้อมูลคนขับหรือไม่ถ้าเป็น driver role
    if (role === 'driver') {
      const driver = await prisma.driver.findUnique({
        where: { user_id: id }
      });

      if (!driver) {
        // สร้างข้อมูลคนขับเบื้องต้น
        await prisma.driver.create({
          data: {
            user_id: id,
            license_number: '',
            id_card_number: '',
            status: 'inactive',
            rating: 0,
          },
        });
        
        logger.info(`สร้างข้อมูลคนขับเบื้องต้นเมื่อล็อกอิน: ${email}`);
      }
    }

    logger.info(`ผู้ใช้ล็อกอิน: ${email} เวลา ${loginTime}`);
  } catch (error) {
    logger.error('เกิดข้อผิดพลาดในการจัดการ USER_LOGGED_IN:', error);
  }
};

const handleUserProfileUpdated = async (data: any): Promise<void> => {
  try {
    const { id, email, fullName, phone, avatar, role } = data;
    
    if (!id) {
      logger.warn('ข้อมูล USER_PROFILE_UPDATED ไม่สมบูรณ์:', data);
      return;
    }
    
    // ตรวจสอบว่ามีคนขับที่เชื่อมโยงกับ user_id นี้หรือไม่
    const driver = await prisma.driver.findUnique({
      where: { user_id: id }
    });
    
    // ถ้าผู้ใช้เปลี่ยนบทบาทเป็น driver แต่ยังไม่มีข้อมูลคนขับ
    if (role === 'driver' && !driver) {
      await prisma.driver.create({
        data: {
          user_id: id,
          license_number: '',
          id_card_number: '',
          status: 'inactive',
          rating: 0,
        },
      });
      
      logger.info(`สร้างข้อมูลคนขับเมื่อผู้ใช้เปลี่ยนบทบาทเป็นคนขับ: ${email}`);
    }
    
    logger.info(`อัปเดตข้อมูลผู้ใช้: ${email}`);
  } catch (error) {
    logger.error('เกิดข้อผิดพลาดในการจัดการ USER_PROFILE_UPDATED:', error);
  }
};