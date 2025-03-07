// controllers/socketController.js - ตัวควบคุมการทำงานเกี่ยวกับ WebSocket

const Driver = require('../models/driverModel');
const jwt = require('jsonwebtoken');

exports.setup = (io) => {
  io.on('connection', (socket) => {
    console.log('มีการเชื่อมต่อจากไคลเอนต์');
    
    socket.on('driver_connect', async (data) => {
      try {
        // ตรวจสอบโทเคนของคนขับ
        const decoded = jwt.verify(
          data.token, 
          process.env.JWT_SECRET || 'your_jwt_secret'
        );
        const driverId = decoded.id;
        
        // เชื่อมโยง socket กับคนขับ
        socket.driverId = driverId;
        socket.join(`driver_${driverId}`);
        
        console.log(`คนขับ ${driverId} เชื่อมต่อแล้ว`);
        
        // อัปเดตสถานะคนขับเป็นพร้อมใช้งานหากกำลังออฟไลน์
        await Driver.findByIdAndUpdate(
          driverId,
          { 
            status: 'available',
            updatedAt: Date.now()
          },
          { new: true }
        );
        
        // แจ้งเตือนว่าคนขับพร้อมใช้งาน
        io.emit('driver_available', { driverId });
      } catch (error) {
        console.error('เกิดข้อผิดพลาดในการเชื่อมต่อคนขับ:', error);
        socket.emit('error', { message: 'การยืนยันตัวตนล้มเหลว' });
      }
    });
    
    socket.on('disconnect', async () => {
      if (socket.driverId) {
        try {
          // อัปเดตสถานะคนขับเป็นออฟไลน์
          await Driver.findByIdAndUpdate(
            socket.driverId,
            { 
              status: 'offline',
              updatedAt: Date.now()
            },
            { new: true }
          );
          
          console.log(`คนขับ ${socket.driverId} ตัดการเชื่อมต่อแล้ว`);
          
          // แจ้งเตือนว่าคนขับไม่พร้อมใช้งาน
          io.emit('driver_unavailable', { driverId: socket.driverId });
        } catch (error) {
          console.error('เกิดข้อผิดพลาดในการตัดการเชื่อมต่อคนขับ:', error);
        }
      }
    });
    
    // รับการส่งข้อความจากคนขับถึงลูกค้า
    socket.on('driver_message', (data) => {
      if (socket.driverId && data.toCustomerId && data.message) {
        io.to(`customer_${data.toCustomerId}`).emit('new_message', {
          fromDriverId: socket.driverId,
          message: data.message,
          timestamp: new Date()
        });
      }
    });
    
    // รับการอัปเดตสถานะการขนส่งจากคนขับ
    socket.on('delivery_status_update', async (data) => {
      if (socket.driverId && data.orderId && data.status) {
        // ส่งข้อมูลการอัปเดตสถานะไปยังลูกค้า
        io.emit('order_status_changed', {
          orderId: data.orderId,
          driverId: socket.driverId,
          status: data.status,
          location: data.location,
          timestamp: new Date()
        });
        
        console.log(`คนขับ ${socket.driverId} อัปเดตสถานะคำสั่ง ${data.orderId} เป็น ${data.status}`);
      }
    });
  });
  
  return io;
};