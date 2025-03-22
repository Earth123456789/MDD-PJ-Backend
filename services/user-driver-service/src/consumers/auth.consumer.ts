// user-driver-service/src/consumers/auth.consumer.ts

import { consumeMessages } from "../config/rabbitmq";
import { logger } from "../utils/logger";
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const setupAuthConsumer = async (): Promise<void> => {
  try {
    await consumeMessages("auth_service_events", async (message) => {
      logger.info("Received Auth Event:", message);

      switch (message.event) {
        case "USER_REGISTERED":
          await handleUserRegistered(message.data);
          break;

        case "USER_LOGGED_IN":
          await handleUserLoggedIn(message.data);
          break;

        default:
          logger.warn("Unhandled Auth Event:", message.event);
      }
    });
  } catch (error) {
    logger.error("Failed to consume auth events:", error);
  }
};

const handleUserRegistered = async (data: any): Promise<void> => {
  try {
    const { id, email } = data;

    if (!id || !email) {
      logger.warn("Invalid USER_REGISTERED data:", data);
      return;
    }

    await prisma.user.create({
      data: {
        email,
        password: "", // ยังไม่ต้องใส่ password จาก auth service
        full_name: "",
        phone: "",
        role: "customer",
      },
    });

    logger.info(`Created user from Auth Service: ${email}`);
  } catch (error) {
    logger.error("Error handling USER_REGISTERED:", error);
  }
};

const handleUserLoggedIn = async (data: any): Promise<void> => {
  try {
    const { id, email, loginTime } = data;

    if (!id || !email) {
      logger.warn("Invalid USER_LOGGED_IN data:", data);
      return;
    }

    logger.info(`User logged in: ${email} at ${loginTime}`);
    // จะเก็บ log อย่างเดียว หรือจะเก็บใน DB ก็สามารถทำเพิ่มได้ที่นี่
  } catch (error) {
    logger.error("Error handling USER_LOGGED_IN:", error);
  }
};
