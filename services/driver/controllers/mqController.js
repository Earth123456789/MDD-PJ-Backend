// controllers/mqController.js - ตัวควบคุมการทำงานเกี่ยวกับ RabbitMQ

const amqp = require('amqplib');
const Driver = require('../models/driverModel');
const { io } = require('../server');

let channel;

// เชื่อมต่อกับ RabbitMQ
exports.connectRabbitMQ = async () => {
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost');
    channel = await connection.createChannel();
    
    // ตั้งค่าคิว
    await channel.assertQueue('driver_updates', { durable: true });
    await channel.assertQueue('matching_requests', { durable: true });
    await channel.assertQueue('matching_responses', { durable: true });
    await channel.assertQueue('delivery_responses', { durable: true });
    await channel.assertQueue('delivery_completions', { durable: true });
    
    console.log('เชื่อมต่อกับ RabbitMQ สำเร็จ');
    return channel;
  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการเชื่อมต่อ RabbitMQ:', error);
    throw error;
  }
};

// ส่งข้อมูลการอัปเดตคนขับ
exports.publishDriverUpdate = (data) => {
  if (channel) {
    channel.sendToQueue('driver_updates', Buffer.from(JSON.stringify(data)));
    return true;
  }
  return false;
};

// ส่งข้อมูลการตอบสนองการขนส่ง (ตอบรับ/ปฏิเสธ)
exports.publishDeliveryResponse = (data) => {
  if (channel) {
    channel.sendToQueue('delivery_responses', Buffer.from(JSON.stringify(data)));
    return true;
  }
  return false;
};

// ส่งข้อมูลการเสร็จสิ้นการขนส่ง
exports.publishDeliveryCompletion = (data) => {
  if (channel) {
    channel.sendToQueue('delivery_completions', Buffer.from(JSON.stringify(data)));
    return true;
  }
  return false;
};

// ตั้งค่า RabbitMQ consumers
exports.setupConsumers = async () => {
  try {
    if (!channel) {
      console.log('ช่อง RabbitMQ ไม่พร้อมใช้งาน');
      return false;
    }

    // รับข้อมูลคำขอจับคู่
    channel.consume('matching_requests', async (msg) => {
      if (msg) {
        try {
          const data = JSON.parse(msg.content.toString());
          console.log('ได้รับคำขอจับคู่:', data);
          
          // ค้นหาคนขับที่เหมาะสมตามตำแหน่งและประเภทยานพาหนะ
          const drivers = await Driver.find({
            status: 'available',
            vehicleType: data.requiredVehicleType,
            currentLocation: {
              $near: {
                $geometry: {
                  type: 'Point',
                  coordinates: [data.pickupLocation.longitude, data.pickupLocation.latitude]
                },
                $maxDistance: 10000 // รัศมี 10km
              }
            }
          }).limit(5);
          
          if (drivers.length > 0) {
            // แจ้งเตือนคนขับเกี่ยวกับคำสั่ง
            drivers.forEach(driver => {
              io.to(`driver_${driver._id}`).emit('new_order_request', {
                orderId: data.orderId,
                pickup: data.pickupLocation,
                dropoff: data.dropoffLocation,
                cargo: data.cargoDetails,
                price: data.price
              });
            });
            
            // ส่งการตอบสนองผ่าน RabbitMQ
            channel.sendToQueue('matching_responses', Buffer.from(JSON.stringify({
              orderId: data.orderId,
              potentialDrivers: drivers.map(d => ({
                driverId: d._id,
                name: `${d.firstName} ${d.lastName}`,
                vehicleType: d.vehicleType,
                rating: d.rating
              })),
              timestamp: new Date()
            })));
          } else {
            // ไม่พบคนขับที่เหมาะสม
            channel.sendToQueue('matching_responses', Buffer.from(JSON.stringify({
              orderId: data.orderId,
              potentialDrivers: [],
              timestamp: new Date()
            })));
          }
          
          // ยืนยันการรับข้อความ
          channel.ack(msg);
        } catch (error) {
          console.error('เกิดข้อผิดพลาดในการประมวลผลคำขอจับคู่:', error);
          channel.nack(msg);
        }
      }
    });
    
    console.log('ตั้งค่า RabbitMQ consumers สำเร็จ');
    return true;
  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการตั้งค่า RabbitMQ consumers:', error);
    return false;
  }
};