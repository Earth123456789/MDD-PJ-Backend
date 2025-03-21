// order-matching-service/src/services/matchingService.ts

import { PrismaClient } from "@prisma/client";
import { OrderStatus, MatchingStatus } from "../types";
import { logger } from "../utils/logger";
import { publishMessage } from "../config/rabbitmq";
import orderService from "./orderService";
import axios from "axios";

const prisma = new PrismaClient();

// กำหนด URL ของ User & Driver Service
const USER_DRIVER_SERVICE_URL =
  process.env.USER_DRIVER_SERVICE_URL || "http://localhost:3001/api";

class MatchingService {
  /**
   * เริ่มกระบวนการจับคู่ออเดอร์กับรถ
   */
  public async startMatching(orderId: number): Promise<any> {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { package_details: true },
      });

      if (!order) {
        throw new Error("Order not found");
      }

      // ตรวจสอบว่าออเดอร์อยู่ในสถานะที่สามารถจับคู่ได้
      const matchableStatuses = [OrderStatus.PENDING, OrderStatus.CONFIRMED];
      if (!matchableStatuses.includes(order.status as OrderStatus)) {
        throw new Error(`Cannot match order with status ${order.status}`);
      }

      // อัพเดทสถานะออเดอร์เป็น MATCHING
      await orderService.updateOrderStatus(
        orderId,
        OrderStatus.MATCHING,
        "Looking for available vehicle"
      );

      // ดึงข้อมูลรถที่เหมาะสมจาก User & Driver Service
      const availableVehicles = await this.findSuitableVehicles(order);

      if (!availableVehicles || availableVehicles.length === 0) {
        // ไม่พบรถที่เหมาะสม
        await orderService.updateOrderStatus(
          orderId,
          OrderStatus.CONFIRMED,
          "No suitable vehicle found"
        );
        return { success: false, message: "No suitable vehicle found" };
      }

      // เริ่มกระบวนการส่งคำขอไปยังคนขับ
      const matchingAttempts = await this.createMatchingAttempts(
        order,
        availableVehicles
      );

      // ส่งคำขอไปยังคนขับคนแรก
      await this.sendMatchingRequest(matchingAttempts[0]);

      return {
        success: true,
        message: "Matching process started",
        attempts: matchingAttempts.length,
      };
    } catch (error) {
      logger.error("Error starting matching process", error);
      throw error;
    }
  }

  /**
   * ค้นหารถที่เหมาะสมสำหรับออเดอร์
   */
  private async findSuitableVehicles(order: any): Promise<any[]> {
    try {
      // ถ้าไม่มีข้อมูลพัสดุ
      if (!order.package_details) {
        throw new Error("Package details not found");
      }

      // เตรียมข้อมูลสำหรับการค้นหารถ
      const packageDetails = order.package_details;

      // สร้างพารามิเตอร์สำหรับ API call
      const params: any = {
        weight_kg: packageDetails.weight_kg,
      };

      // เพิ่มข้อมูลปริมาตรถ้ามี
      if (packageDetails.volume_m3) {
        params.volume_m3 = packageDetails.volume_m3;
      }

      // เพิ่มข้อมูลขนาดถ้ามี
      if (
        packageDetails.length_m &&
        packageDetails.width_m &&
        packageDetails.height_m
      ) {
        params.length_m = packageDetails.length_m;
        params.width_m = packageDetails.width_m;
        params.height_m = packageDetails.height_m;
      }

      // เรียกใช้ API ของ User & Driver Service
      const response = await axios.get(
        `${USER_DRIVER_SERVICE_URL}/vehicles/capacity`,
        {
          params,
        }
      );

      // ตรวจสอบ response
      if (!response.data.success) {
        throw new Error("Failed to fetch suitable vehicles");
      }

      // เรียงลำดับรถตามระยะทางจากจุดรับสินค้า
      const sortedVehicles = this.sortVehiclesByDistance(
        response.data.data,
        order.pickup_location.latitude,
        order.pickup_location.longitude
      );

      return sortedVehicles;
    } catch (error) {
      logger.error("Error finding suitable vehicles", error);
      throw error;
    }
  }

  /**
   * เรียงลำดับรถตามระยะทางจากจุดรับสินค้า
   */
  private sortVehiclesByDistance(
    vehicles: any[],
    pickupLat: number,
    pickupLng: number
  ): any[] {
    return vehicles
      .filter((vehicle) => {
        // กรองเฉพาะรถที่มี driver ที่ active และมีตำแหน่งปัจจุบัน
        return (
          vehicle.driver &&
          vehicle.driver.status === "active" &&
          vehicle.driver.current_location
        );
      })
      .map((vehicle) => {
        // คำนวณระยะทางจากตำแหน่งคนขับถึงจุดรับสินค้า
        const driverLocation = vehicle.driver.current_location;
        const distance = this.calculateDistance(
          driverLocation.latitude,
          driverLocation.longitude,
          pickupLat,
          pickupLng
        );

        // คำนวณเวลาที่คาดว่าจะถึงจุดรับสินค้า (โดยประมาณ)
        const estimatedArrival = Math.round(distance * 2); // 2 นาทีต่อกิโลเมตร (ประมาณ)

        return {
          ...vehicle,
          distance_to_pickup: distance,
          estimated_arrival_min: estimatedArrival,
        };
      })
      .sort((a, b) => a.distance_to_pickup - b.distance_to_pickup);
  }

  /**
   * คำนวณระยะทางระหว่างสองจุด (Haversine formula)
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // รัศมีของโลกในหน่วยกิโลเมตร
    const dLat = this.degToRad(lat2 - lat1);
    const dLon = this.degToRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.degToRad(lat1)) *
        Math.cos(this.degToRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // ระยะทางในหน่วยกิโลเมตร

    return distance;
  }

  /**
   * แปลงองศาเป็นเรเดียน
   */
  private degToRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  /**
   * สร้างการจับคู่สำหรับรถที่เหมาะสม
   */
  private async createMatchingAttempts(
    order: any,
    vehicles: any[]
  ): Promise<any[]> {
    try {
      // ลบการจับคู่เดิมที่อาจมีอยู่
      await prisma.matchingAttempt.deleteMany({
        where: {
          order_id: order.id,
          status: { in: [MatchingStatus.PENDING, MatchingStatus.EXPIRED] },
        },
      });

      // จำกัดจำนวนรถที่จะส่งคำขอ
      const vehiclesToMatch = vehicles.slice(0, 5); // เลือกเพียง 5 คันแรก

      // สร้างการจับคู่สำหรับแต่ละรถ
      const matchingPromises = vehiclesToMatch.map((vehicle) => {
        return prisma.matchingAttempt.create({
          data: {
            order_id: order.id,
            vehicle_id: vehicle.id,
            driver_id: vehicle.driver_id,
            status: MatchingStatus.PENDING,
            distance_km: vehicle.distance_to_pickup,
            estimated_arrival_min: vehicle.estimated_arrival_min,
          },
        });
      });

      const matchingAttempts = await Promise.all(matchingPromises);

      logger.info("Created matching attempts", {
        orderId: order.id,
        count: matchingAttempts.length,
      });

      return matchingAttempts;
    } catch (error) {
      logger.error("Error creating matching attempts", error);
      throw error;
    }
  }

  /**
   * ส่งคำขอจับคู่ไปยังคนขับ
   */
  private async sendMatchingRequest(matchingAttempt: any): Promise<void> {
    try {
      // ดึงข้อมูลออเดอร์
      const order = await prisma.order.findUnique({
        where: { id: matchingAttempt.order_id },
        include: { package_details: true },
      });

      if (!order) {
        throw new Error("Order not found");
      }

      // เพิ่มการตรวจสอบ package_details
      const packageDetails = order.package_details;

      // ส่ง Event ไปยัง RabbitMQ เพื่อแจ้งเตือนคนขับ
      await publishMessage("driver-events", {
        event: "MATCHING_REQUEST",
        data: {
          matchingId: matchingAttempt.id,
          orderId: order.id,
          driverId: matchingAttempt.driver_id,
          vehicleId: matchingAttempt.vehicle_id,
          pickupLocation: order.pickup_location,
          dropoffLocation: order.dropoff_location,
          packageDetails: {
            weight: packageDetails ? packageDetails.weight_kg : null,
            dimensions:
              packageDetails && packageDetails.length_m
                ? `${packageDetails.length_m}x${packageDetails.width_m}x${packageDetails.height_m}m`
                : undefined,
          },
          price: order.price,
          distance: order.distance_km,
          estimatedArrival: matchingAttempt.estimated_arrival_min,
          expireAt: new Date(Date.now() + 60000).toISOString(), // หมดอายุใน 1 นาที
          timestamp: new Date().toISOString(),
        },
      });

      logger.info("Sent matching request to driver", {
        matchingId: matchingAttempt.id,
        driverId: matchingAttempt.driver_id,
      });

      // ตั้งเวลาหมดอายุสำหรับคำขอนี้
      setTimeout(() => {
        this.handleExpiredMatching(matchingAttempt.id, order.id);
      }, 60000); // 1 นาที
    } catch (error) {
      logger.error("Error sending matching request", error);
      throw error;
    }
  }

  /**
   * จัดการกับคำขอที่หมดอายุ
   */
  private async handleExpiredMatching(
    matchingId: number,
    orderId: number
  ): Promise<void> {
    try {
      // ตรวจสอบสถานะปัจจุบันของคำขอ
      const matching = await prisma.matchingAttempt.findUnique({
        where: { id: matchingId },
      });

      // ถ้าไม่มีคำขอนี้แล้ว หรือสถานะไม่ใช่ PENDING
      if (!matching || matching.status !== MatchingStatus.PENDING) {
        return;
      }

      // อัพเดทสถานะคำขอเป็น EXPIRED
      await prisma.matchingAttempt.update({
        where: { id: matchingId },
        data: { status: MatchingStatus.EXPIRED },
      });

      logger.info("Matching request expired", {
        matchingId,
        orderId,
      });

      // ดูว่ามีคำขอที่ยังไม่ได้ส่งหรือไม่
      const pendingMatching = await prisma.matchingAttempt.findFirst({
        where: {
          order_id: orderId,
          status: MatchingStatus.PENDING,
        },
        orderBy: {
          estimated_arrival_min: "asc",
        },
      });

      if (pendingMatching) {
        // ส่งคำขอไปยังคนขับคนถัดไป
        await this.sendMatchingRequest(pendingMatching);
      } else {
        // ไม่มีคนขับที่สามารถรับงานได้แล้ว
        const allExpired = await prisma.matchingAttempt.findMany({
          where: {
            order_id: orderId,
          },
        });

        // ใช้ method includes กับ type casting
        if (
          allExpired.every((m) =>
            [MatchingStatus.EXPIRED, MatchingStatus.REJECTED].includes(
              m.status as MatchingStatus
            )
          )
        ) {
          // ไม่มีคนขับคนไหนตอบรับเลย
          await orderService.updateOrderStatus(
            orderId,
            OrderStatus.CONFIRMED,
            "No driver accepted the order"
          );

          // ส่ง Event แจ้งเตือนไปยังลูกค้า
          const order = await prisma.order.findUnique({
            where: { id: orderId },
          });

          if (order) {
            await publishMessage("order-events", {
              event: "MATCHING_FAILED",
              data: {
                orderId,
                userId: order.customer_id,
                timestamp: new Date().toISOString(),
              },
            });
          }
        }
      }
    } catch (error) {
      logger.error("Error handling expired matching", error);
    }
  }

  /**
   * คนขับตอบรับการจับคู่
   */
  public async acceptMatching(matchingId: number): Promise<any> {
    try {
      const matching = await prisma.matchingAttempt.findUnique({
        where: { id: matchingId },
      });

      if (!matching) {
        throw new Error("Matching not found");
      }

      // ตรวจสอบว่าคำขอยังไม่หมดอายุ
      if (matching.status !== MatchingStatus.PENDING) {
        throw new Error(
          `Cannot accept matching with status ${matching.status}`
        );
      }

      // ดำเนินการในธุรกรรมเดียวกัน
      const result = await prisma.$transaction(async (tx) => {
        // อัพเดทสถานะคำขอ
        const updatedMatching = await tx.matchingAttempt.update({
          where: { id: matchingId },
          data: { status: MatchingStatus.ACCEPTED },
        });

        // อัพเดทสถานะออเดอร์
        await tx.order.update({
          where: { id: matching.order_id },
          data: {
            status: OrderStatus.MATCHED,
            vehicle_id: matching.vehicle_id,
            driver_id: matching.driver_id,
          },
        });

        // เพิ่มประวัติสถานะ
        await tx.statusHistory.create({
          data: {
            order_id: matching.order_id,
            status: OrderStatus.MATCHED,
            note: `Matched with driver ID ${matching.driver_id}`,
          },
        });

        // ยกเลิกคำขออื่นๆ สำหรับออเดอร์นี้
        await tx.matchingAttempt.updateMany({
          where: {
            order_id: matching.order_id,
            id: { not: matchingId },
            status: MatchingStatus.PENDING,
          },
          data: { status: MatchingStatus.CANCELLED },
        });

        return updatedMatching;
      });

      // ดึงข้อมูลที่จำเป็นสำหรับการส่ง event
      const order = await prisma.order.findUnique({
        where: { id: matching.order_id },
      });

      // ดึงข้อมูลคนขับจาก User & Driver Service
      const driverResponse = await axios.get(
        `${USER_DRIVER_SERVICE_URL}/drivers/${matching.driver_id}`
      );
      const driver = driverResponse.data.data;

      // ส่ง Event แจ้งเตือนลูกค้า
      await publishMessage("order-events", {
        event: "ORDER_MATCHED",
        data: {
          orderId: matching.order_id,
          userId: order?.customer_id,
          driverId: matching.driver_id,
          vehicleId: matching.vehicle_id,
          driverName: driver?.user?.full_name || "Driver",
          timestamp: new Date().toISOString(),
        },
      });

      logger.info("Driver accepted matching", {
        matchingId,
        orderId: matching.order_id,
        driverId: matching.driver_id,
      });

      return { success: true, matching: result };
    } catch (error) {
      logger.error("Error accepting matching", error);
      throw error;
    }
  }

  /**
   * คนขับปฏิเสธการจับคู่
   */
  public async rejectMatching(
    matchingId: number,
    reason?: string
  ): Promise<any> {
    try {
      const matching = await prisma.matchingAttempt.findUnique({
        where: { id: matchingId },
      });

      if (!matching) {
        throw new Error("Matching not found");
      }

      // ตรวจสอบว่าคำขอยังไม่หมดอายุ
      if (matching.status !== MatchingStatus.PENDING) {
        throw new Error(
          `Cannot reject matching with status ${matching.status}`
        );
      }

      // อัพเดทสถานะคำขอ
      const updatedMatching = await prisma.matchingAttempt.update({
        where: { id: matchingId },
        data: { status: MatchingStatus.REJECTED },
      });

      logger.info("Driver rejected matching", {
        matchingId,
        orderId: matching.order_id,
        driverId: matching.driver_id,
        reason,
      });

      // ดูว่ามีคำขอที่ยังไม่ได้ส่งหรือไม่
      const pendingMatching = await prisma.matchingAttempt.findFirst({
        where: {
          order_id: matching.order_id,
          status: MatchingStatus.PENDING,
        },
        orderBy: {
          estimated_arrival_min: "asc",
        },
      });

      if (pendingMatching) {
        // ส่งคำขอไปยังคนขับคนถัดไป
        await this.sendMatchingRequest(pendingMatching);
      } else {
        // ไม่มีคนขับที่สามารถรับงานได้แล้ว
        const allRejected = await prisma.matchingAttempt.findMany({
          where: {
            order_id: matching.order_id,
          },
        });

        // ใช้ method includes กับ type casting
        if (
          allRejected.every((m) =>
            [MatchingStatus.EXPIRED, MatchingStatus.REJECTED].includes(
              m.status as MatchingStatus
            )
          )
        ) {
          // ไม่มีคนขับคนไหนตอบรับเลย
          await orderService.updateOrderStatus(
            matching.order_id,
            OrderStatus.CONFIRMED,
            "All drivers rejected the order"
          );

          // ส่ง Event แจ้งเตือนไปยังลูกค้า
          const order = await prisma.order.findUnique({
            where: { id: matching.order_id },
          });

          if (order) {
            await publishMessage("order-events", {
              event: "MATCHING_FAILED",
              data: {
                orderId: matching.order_id,
                userId: order.customer_id,
                timestamp: new Date().toISOString(),
              },
            });
          }
        }
      }

      return { success: true, matching: updatedMatching };
    } catch (error) {
      logger.error("Error rejecting matching", error);
      throw error;
    }
  }
}

export default new MatchingService();
