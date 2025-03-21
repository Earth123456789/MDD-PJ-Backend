// tracking-notification-service/src/services/emailService.ts

import nodemailer from "nodemailer";
import { logger } from "../utils/logger";

export class EmailService {
  private transporter: any;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.example.com",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER || "user@example.com",
        pass: process.env.SMTP_PASSWORD || "password",
      },
    });
  }

  /**
   * ส่งอีเมล
   */
  public async sendEmail(
    to: string,
    subject: string,
    html: string
  ): Promise<boolean> {
    try {
      const info = await this.transporter.sendMail({
        from:
          process.env.EMAIL_FROM ||
          '"ระบบจัดส่งสินค้า" <noreply@delivery.example.com>',
        to,
        subject,
        html,
      });

      logger.info("ส่งอีเมลสำเร็จ", {
        messageId: info.messageId,
        to,
      });

      return true;
    } catch (error) {
      logger.error("ไม่สามารถส่งอีเมลได้", error);
      return false;
    }
  }

  /**
   * สร้าง template อีเมลสำหรับการแจ้งเตือนออเดอร์
   */
  public createOrderUpdateEmailTemplate(orderData: any, userData: any): string {
    // แปลงสถานะภาษาอังกฤษเป็นภาษาไทยสำหรับการแสดงผล
    const statusMapping: { [key: string]: string } = {
      'created': 'สร้างออเดอร์แล้ว',
      'confirmed': 'ยืนยันออเดอร์แล้ว',
      'matched': 'จับคู่กับคนขับแล้ว',
      'in_progress': 'กำลังจัดส่ง',
      'arrived_at_pickup': 'คนขับถึงจุดรับสินค้าแล้ว',
      'arrived_at_dropoff': 'คนขับถึงจุดส่งสินค้าแล้ว',
      'delivered': 'จัดส่งแล้ว',
      'completed': 'เสร็จสิ้นแล้ว',
      'cancelled': 'ยกเลิกแล้ว'
    };

    // สีตามสถานะ
    const statusColor: { [key: string]: string } = {
      'created': '#3498db', // น้ำเงิน
      'confirmed': '#f39c12', // ส้ม
      'matched': '#1abc9c',  // เขียวฟ้า 
      'in_progress': '#9b59b6', // ม่วง
      'arrived_at_pickup': '#e67e22', // ส้มเข้ม
      'arrived_at_dropoff': '#2980b9', // น้ำเงินเข้ม
      'delivered': '#27ae60', // เขียวเข้ม
      'completed': '#2ecc71', // เขียว
      'cancelled': '#e74c3c' // แดง
    };

    // ข้อความสถานะภาษาไทยสำหรับปุ่มในอีเมล
    const statusButtonMapping: { [key: string]: string } = {
      'created': 'ออเดอร์สร้างแล้ว',
      'confirmed': 'ออเดอร์ยืนยันแล้ว',
      'matched': 'จับคู่คนขับแล้ว',
      'in_progress': 'กำลังจัดส่ง',
      'arrived_at_pickup': 'ถึงจุดรับสินค้า',
      'arrived_at_dropoff': 'ถึงจุดส่งสินค้า',
      'delivered': 'จัดส่งแล้ว',
      'completed': 'จัดส่งสำเร็จแล้ว',
      'cancelled': 'ยกเลิกออเดอร์แล้ว'
    };

    // ข้อความแจ้งเตือนตามสถานะ
    const statusMessageMapping: { [key: string]: string } = {
      'created': 'ออเดอร์หมายเลข #{orderId} ของคุณได้รับการสร้างแล้ว!',
      'confirmed': 'ออเดอร์หมายเลข #{orderId} ของคุณได้รับการยืนยันแล้ว!',
      'matched': 'ออเดอร์หมายเลข #{orderId} ของคุณได้รับการจับคู่กับคนขับแล้ว!',
      'in_progress': 'ออเดอร์หมายเลข #{orderId} ของคุณกำลังอยู่ระหว่างการจัดส่ง!',
      'arrived_at_pickup': 'คนขับถึงจุดรับสินค้าสำหรับออเดอร์หมายเลข #{orderId} แล้ว!',
      'arrived_at_dropoff': 'คนขับถึงจุดส่งสินค้าสำหรับออเดอร์หมายเลข #{orderId} แล้ว!',
      'delivered': 'ออเดอร์หมายเลข #{orderId} ได้รับการจัดส่งแล้ว!',
      'completed': 'ออเดอร์หมายเลข #{orderId} เสร็จสิ้นเรียบร้อยแล้ว!',
      'cancelled': 'ออเดอร์หมายเลข #{orderId} ได้รับการยกเลิกแล้ว!'
    };

    // กำหนดสถานะปัจจุบัน (ใช้ newStatus ถ้ามี หรือไม่ก็ใช้ status)
    const currentStatus = orderData.newStatus || orderData.status || 'created';
    
    // ดึงค่าจากการแมปปิ้ง หรือใช้ค่าเริ่มต้นถ้าไม่พบ
    const thaiStatus = statusMapping[currentStatus] || statusMapping['created'];
    const buttonText = statusButtonMapping[currentStatus] || statusButtonMapping['created'];
    const statusColorHex = statusColor[currentStatus] || statusColor['created'];
    
    // สร้างข้อความแจ้งเตือนโดยแทนที่ {orderId} ด้วยหมายเลขออเดอร์จริง
    let statusMessage = statusMessageMapping[currentStatus] || statusMessageMapping['created'];
    statusMessage = statusMessage.replace('{orderId}', orderData.orderId);

    const formattedDate = new Date(orderData.timestamp).toLocaleString(
      "th-TH",
      {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    );

    const userName = userData.full_name || "คุณลูกค้า";
    const orderId = orderData.orderId || "1";
    
    // ข้อมูลเพิ่มเติมสำหรับกรณีพิเศษ
    const driverInfo = orderData.driverName 
      ? `<div class="info-row">คนขับ: ${orderData.driverName}</div>` 
      : "";
    
    const cancelReason = orderData.reason 
      ? `<div class="info-row">เหตุผลที่ยกเลิก: ${orderData.reason}</div>` 
      : "";

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>แจ้งอัปเดตสถานะออเดอร์</title>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@300;400;500;700&display=swap">
      <style>
        body {
          font-family: 'Noto Sans Thai', sans-serif;
          line-height: 1.6;
          color: #333333;
          margin: 0;
          padding: 0;
          background-color: #f9f9f9;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #ffffff;
        }
        .header {
          text-align: center;
          padding: 20px 0;
          border-bottom: 1px solid #eeeeee;
        }
        .content {
          padding: 20px 0;
        }
        .status-badge {
          display: inline-block;
          background-color: ${statusColorHex};
          color: white;
          padding: 8px 16px;
          border-radius: 50px;
          font-weight: 500;
          margin-bottom: 20px;
        }
        .order-details {
          background-color: #f8f9fa;
          padding: 15px;
          border-radius: 5px;
          margin: 20px 0;
        }
        .info-row {
          margin-bottom: 8px;
        }
        .button {
          display: inline-block;
          background-color: #3498db;
          color: white;
          text-decoration: none;
          padding: 10px 20px;
          border-radius: 4px;
          font-weight: 500;
          margin-top: 20px;
        }
        .footer {
          text-align: center;
          padding-top: 20px;
          border-top: 1px solid #eeeeee;
          color: #999999;
          font-size: 0.85em;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="color: #3498db; font-weight: 500;">ระบบจัดส่งสินค้า</h1>
        </div>
        
        <div class="content">
          <h2 style="font-weight: 500;">สวัสดีคุณ ${userName}</h2>
          
          <p>ออเดอร์หมายเลข #${orderId} ของคุณมีการอัปเดต!</p>
          
          <div class="status-badge">
            ${buttonText}
          </div>
          
          <p>${statusMessage}</p>
          
          <div class="order-details">
            <div class="info-row">
              หมายเลขออเดอร์: ${orderId}
            </div>
            <div class="info-row">
              สถานะ: ${thaiStatus}
            </div>
            <div class="info-row">
              วันเวลา: ${formattedDate}
            </div>
            ${driverInfo}
            ${cancelReason}
          </div>
          
          <a href="https://example.com/tracking/${orderId}" class="button" style="color: white;">ติดตามออเดอร์</a>
        </div>
        
        <div class="footer">
          <p>หากมีข้อสงสัยหรือต้องการความช่วยเหลือ กรุณาติดต่อเรา</p>
        </div>
      </div>
    </body>
    </html>
  `;
  }

  /**
   * สร้าง template อีเมลสำหรับการลงทะเบียนผู้ใช้ใหม่
   */
  public createWelcomeEmailTemplate(userData: any): string {
    const userName = userData.full_name || "คุณผู้ใช้";
    const role = this.translateUserRole(userData.role);
    
    const formattedDate = new Date().toLocaleString(
      "th-TH",
      {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    );

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>ยินดีต้อนรับสู่ระบบจัดส่งสินค้า</title>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@300;400;500;700&display=swap">
      <style>
        body {
          font-family: 'Noto Sans Thai', sans-serif;
          line-height: 1.6;
          color: #333333;
          margin: 0;
          padding: 0;
          background-color: #f9f9f9;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #ffffff;
        }
        .header {
          text-align: center;
          padding: 20px 0;
          border-bottom: 1px solid #eeeeee;
        }
        .content {
          padding: 20px 0;
        }
        .welcome-box {
          background-color: #e8f4fc;
          padding: 20px;
          border-radius: 5px;
          margin: 20px 0;
          text-align: center;
        }
        .user-details {
          background-color: #f8f9fa;
          padding: 15px;
          border-radius: 5px;
          margin: 20px 0;
        }
        .info-row {
          margin-bottom: 8px;
        }
        .button {
          display: inline-block;
          background-color: #3498db;
          color: white;
          text-decoration: none;
          padding: 10px 20px;
          border-radius: 4px;
          font-weight: 500;
          margin-top: 20px;
        }
        .footer {
          text-align: center;
          padding-top: 20px;
          border-top: 1px solid #eeeeee;
          color: #999999;
          font-size: 0.85em;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="color: #3498db; font-weight: 500;">ระบบจัดส่งสินค้า</h1>
        </div>
        
        <div class="content">
          <h2 style="font-weight: 500;">สวัสดีคุณ ${userName}</h2>
          
          <div class="welcome-box">
            <h2 style="color: #3498db;">ยินดีต้อนรับสู่ระบบจัดส่งสินค้า!</h2>
            <p>บัญชีของคุณได้รับการลงทะเบียนเรียบร้อยแล้ว</p>
          </div>
          
          <p>ขอบคุณที่ลงทะเบียนกับเรา คุณสามารถเริ่มใช้งานระบบของเราได้ทันที</p>
          
          <div class="user-details">
            <div class="info-row">
              ชื่อ: ${userData.full_name || '-'}
            </div>
            <div class="info-row">
              อีเมล: ${userData.email || '-'}
            </div>
            <div class="info-row">
              เบอร์โทรศัพท์: ${userData.phone || '-'}
            </div>
            <div class="info-row">
              ประเภทผู้ใช้: ${role}
            </div>
            <div class="info-row">
              วันเวลาลงทะเบียน: ${formattedDate}
            </div>
          </div>
          
          <a href="https://example.com/login" class="button" style="color: white;">เข้าสู่ระบบ</a>
          
          <p style="margin-top: 20px;">หากคุณมีข้อสงสัยหรือต้องการความช่วยเหลือ อย่าลังเลที่จะติดต่อทีมสนับสนุนของเรา</p>
        </div>
        
        <div class="footer">
          <p>หากมีข้อสงสัยหรือต้องการความช่วยเหลือ กรุณาติดต่อเรา</p>
          <p>© ${new Date().getFullYear()} ระบบจัดส่งสินค้า. สงวนลิขสิทธิ์.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  }

  /**
   * สร้าง template อีเมลสำหรับการลงทะเบียนคนขับใหม่
   */
  public createDriverWelcomeEmailTemplate(userData: any, driverData: any): string {
    const userName = userData.full_name || "คุณผู้ใช้";
    
    const formattedDate = new Date().toLocaleString(
      "th-TH",
      {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    );

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>ยินดีต้อนรับคนขับใหม่</title>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@300;400;500;700&display=swap">
      <style>
        body {
          font-family: 'Noto Sans Thai', sans-serif;
          line-height: 1.6;
          color: #333333;
          margin: 0;
          padding: 0;
          background-color: #f9f9f9;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #ffffff;
        }
        .header {
          text-align: center;
          padding: 20px 0;
          border-bottom: 1px solid #eeeeee;
        }
        .content {
          padding: 20px 0;
        }
        .welcome-box {
          background-color: #e8f4fc;
          padding: 20px;
          border-radius: 5px;
          margin: 20px 0;
          text-align: center;
        }
        .user-details {
          background-color: #f8f9fa;
          padding: 15px;
          border-radius: 5px;
          margin: 20px 0;
        }
        .info-row {
          margin-bottom: 8px;
        }
        .button {
          display: inline-block;
          background-color: #3498db;
          color: white;
          text-decoration: none;
          padding: 10px 20px;
          border-radius: 4px;
          font-weight: 500;
          margin-top: 20px;
        }
        .steps {
          margin: 20px 0;
        }
        .step {
          margin-bottom: 15px;
        }
        .step-number {
          display: inline-block;
          width: 25px;
          height: 25px;
          background-color: #3498db;
          color: white;
          border-radius: 50%;
          text-align: center;
          line-height: 25px;
          margin-right: 10px;
        }
        .footer {
          text-align: center;
          padding-top: 20px;
          border-top: 1px solid #eeeeee;
          color: #999999;
          font-size: 0.85em;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="color: #3498db; font-weight: 500;">ระบบจัดส่งสินค้า</h1>
        </div>
        
        <div class="content">
          <h2 style="font-weight: 500;">สวัสดีคุณ ${userName}</h2>
          
          <div class="welcome-box">
            <h2 style="color: #3498db;">ยินดีต้อนรับคนขับใหม่!</h2>
            <p>บัญชีคนขับของคุณได้รับการลงทะเบียนเรียบร้อยแล้ว</p>
          </div>
          
          <p>ขอบคุณที่ลงทะเบียนเป็นคนขับกับเรา กรุณาทำตามขั้นตอนต่อไปนี้เพื่อเริ่มรับงาน:</p>

          <div class="steps">
            <div class="step">
              <span class="step-number">1</span>
              <span>ยืนยันข้อมูลและอัพโหลดเอกสารในระบบให้ครบถ้วน</span>
            </div>
            <div class="step">
              <span class="step-number">2</span>
              <span>ลงทะเบียนข้อมูลรถของคุณ</span>
            </div>
            <div class="step">
              <span class="step-number">3</span>
              <span>รอการอนุมัติจากทีมงาน (ภายใน 1-2 วันทำการ)</span>
            </div>
            <div class="step">
              <span class="step-number">4</span>
              <span>เมื่อได้รับการอนุมัติ คุณสามารถเริ่มรับงานได้ทันที</span>
            </div>
          </div>
          
          <div class="user-details">
            <div class="info-row">
              ชื่อ: ${userData.full_name || '-'}
            </div>
            <div class="info-row">
              อีเมล: ${userData.email || '-'}
            </div>
            <div class="info-row">
              เบอร์โทรศัพท์: ${userData.phone || '-'}
            </div>
            <div class="info-row">
              เลขใบอนุญาตขับขี่: ${driverData.license_number || '-'}
            </div>
            <div class="info-row">
              สถานะปัจจุบัน: ${this.translateDriverStatus(driverData.status)}
            </div>
            <div class="info-row">
              วันเวลาลงทะเบียน: ${formattedDate}
            </div>
          </div>
          
          <a href="https://example.com/driver/login" class="button" style="color: white;">เข้าสู่ระบบคนขับ</a>
          
          <p style="margin-top: 20px;">หากคุณมีข้อสงสัยหรือต้องการความช่วยเหลือ อย่าลังเลที่จะติดต่อทีมสนับสนุนของเรา</p>
        </div>
        
        <div class="footer">
          <p>หากมีข้อสงสัยหรือต้องการความช่วยเหลือ กรุณาติดต่อเรา</p>
          <p>© ${new Date().getFullYear()} ระบบจัดส่งสินค้า. สงวนลิขสิทธิ์.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  }

  /**
   * แปลงสถานะผู้ใช้เป็นภาษาไทย
   */
  private translateUserRole(role: string): string {
    const roleMapping: { [key: string]: string } = {
      'customer': 'ลูกค้า',
      'driver': 'คนขับ',
      'admin': 'ผู้ดูแลระบบ'
    };

    return roleMapping[role] || role;
  }

  /**
   * แปลงสถานะคนขับเป็นภาษาไทย
   */
  private translateDriverStatus(status: string): string {
    const statusMapping: { [key: string]: string } = {
      'active': 'พร้อมให้บริการ',
      'inactive': 'รอการอนุมัติ',
      'suspended': 'ถูกระงับการให้บริการ'
    };

    return statusMapping[status] || status;
  }
}