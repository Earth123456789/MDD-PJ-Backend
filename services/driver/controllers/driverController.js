// controllers/driverController.js - ตัวควบคุมการทำงานเกี่ยวกับคนขับ

const Driver = require('../models/driverModel');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const mqController = require('./mqController');
const { io } = require('../server');

// ฟังก์ชันช่วยสร้าง JWT
const generateToken = (driver) => {
  return jwt.sign(
    { id: driver._id, email: driver.email },
    process.env.JWT_SECRET || 'your_jwt_secret',
    { expiresIn: '1d' }
  );
};

// ลงทะเบียนคนขับใหม่
exports.registerDriver = async (req, res) => {
  // ตรวจสอบความถูกต้องของข้อมูล
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    // ตรวจสอบว่ามีคนขับนี้ในระบบแล้วหรือไม่
    let driver = await Driver.findOne({ email: req.body.email });
    if (driver) return res.status(400).json({ message: 'อีเมลนี้ถูกลงทะเบียนแล้ว' });

    driver = await Driver.findOne({ phone: req.body.phone });
    if (driver) return res.status(400).json({ message: 'เบอร์โทรศัพท์นี้ถูกลงทะเบียนแล้ว' });

    // สร้างคนขับใหม่
    driver = new Driver(req.body);
    await driver.save();

    // สร้างโทเคน
    const token = generateToken(driver);

    res.status(201).json({ 
      message: 'ลงทะเบียนคนขับสำเร็จ',
      token,
      driverId: driver._id
    });
  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการลงทะเบียนคนขับ:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดที่เซิร์ฟเวอร์ขณะลงทะเบียน' });
  }
};

// เข้าสู่ระบบคนขับ
exports.loginDriver = async (req, res) => {
  // ตรวจสอบความถูกต้องของข้อมูล
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    // ค้นหาคนขับด้วยอีเมลและดึงรหัสผ่านมาด้วย
    const driver = await Driver.findOne({ email: req.body.email }).select('+password');
    if (!driver) return res.status(400).json({ message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });

    // ในระบบจริงต้องตรวจสอบรหัสผ่านแบบเข้ารหัส
    // สำหรับตัวอย่างนี้เราเช็คตรงๆ
    if (req.body.password !== driver.password) {
      return res.status(400).json({ message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
    }

    // สร้างโทเคน
    const token = generateToken(driver);

    res.json({ 
      token,
      driverId: driver._id,
      name: `${driver.firstName} ${driver.lastName}`,
      status: driver.status
    });
  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการเข้าสู่ระบบ:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดที่เซิร์ฟเวอร์ขณะเข้าสู่ระบบ' });
  }
};

// อัปเดตตำแหน่งของคนขับ
exports.updateLocation = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { latitude, longitude, status } = req.body;
    const driverId = req.driver.id;

    const updateData = {
      currentLocation: {
        type: 'Point',
        coordinates: [longitude, latitude]
      },
      updatedAt: Date.now()
    };

    if (status) {
      updateData.status = status;
    }

    const driver = await Driver.findByIdAndUpdate(
      driverId,
      updateData,
      { new: true }
    );

    if (!driver) {
      return res.status(404).json({ message: 'ไม่พบข้อมูลคนขับ' });
    }

    // ส่งข้อมูลการอัปเดตไปยัง RabbitMQ
    mqController.publishDriverUpdate({
      driverId,
      location: { latitude, longitude },
      status: driver.status,
      timestamp: new Date()
    });

    // ส่งข้อมูลการอัปเดตผ่าน WebSocket
    io.emit('driver_location', {
      driverId,
      location: { latitude, longitude },
      status: driver.status
    });

    res.json({ message: 'อัปเดตตำแหน่งสำเร็จ', driver });
  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการอัปเดตตำแหน่ง:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดที่เซิร์ฟเวอร์ขณะอัปเดตตำแหน่ง' });
  }
};

// ค้นหาคนขับที่อยู่ใกล้เคียง
exports.getNearbyDrivers = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { latitude, longitude, radius = 10000, vehicleType } = req.body; // รัศมีเป็นเมตร, ค่าเริ่มต้น 10km

    // สร้างคำค้นหา
    const query = {
      currentLocation: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude]
          },
          $maxDistance: radius
        }
      },
      status: 'available'
    };

    // เพิ่มตัวกรองประเภทยานพาหนะถ้าระบุ
    if (vehicleType) {
      query.vehicleType = vehicleType;
    }

    const drivers = await Driver.find(query).select('-__v');

    res.json({ drivers });
  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการค้นหาคนขับใกล้เคียง:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดที่เซิร์ฟเวอร์ขณะค้นหาคนขับใกล้เคียง' });
  }
};

// ตอบรับหรือปฏิเสธคำสั่งขนส่ง
exports.deliveryResponse = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { orderId, accept } = req.body;
    const driverId = req.driver.id;

    if (accept) {
      // อัปเดตสถานะคนขับเป็นกำลังส่งของและตั้งค่าคำสั่งที่กำลังทำ
      const driver = await Driver.findByIdAndUpdate(
        driverId,
        {
          status: 'on_delivery',
          activeOrder: orderId,
          updatedAt: Date.now()
        },
        { new: true }
      );

      if (!driver) {
        return res.status(404).json({ message: 'ไม่พบข้อมูลคนขับ' });
      }

      // ส่งการตอบรับไปยัง RabbitMQ
      mqController.publishDeliveryResponse({
        driverId,
        orderId,
        accepted: true,
        timestamp: new Date()
      });

      // แจ้งเตือนผ่าน WebSocket
      io.emit('order_accepted', {
        driverId,
        orderId,
        driverName: `${driver.firstName} ${driver.lastName}`,
        vehicleInfo: `${driver.vehicleType} - ${driver.vehicleRegistration}`
      });

      res.json({ message: 'ตอบรับคำสั่งสำเร็จ' });
    } else {
      // ส่งการปฏิเสธไปยัง RabbitMQ
      mqController.publishDeliveryResponse({
        driverId,
        orderId,
        accepted: false,
        timestamp: new Date()
      });

      // แจ้งเตือนผ่าน WebSocket
      io.emit('order_rejected', {
        driverId,
        orderId
      });

      res.json({ message: 'ปฏิเสธคำสั่ง' });
    }
  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการประมวลผลการตอบสนองการขนส่ง:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดที่เซิร์ฟเวอร์ขณะประมวลผลการตอบสนอง' });
  }
};

// เสร็จสิ้นการขนส่ง
exports.completeDelivery = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { orderId, deliveryProof } = req.body;
    const driverId = req.driver.id;

    // ตรวจสอบว่านี่เป็นคำสั่งที่คนขับกำลังทำอยู่หรือไม่
    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({ message: 'ไม่พบข้อมูลคนขับ' });
    }

    if (!driver.activeOrder || driver.activeOrder.toString() !== orderId) {
      return res.status(400).json({ message: 'นี่ไม่ใช่คำสั่งที่คุณกำลังทำอยู่' });
    }

    // อัปเดตสถานะคนขับและเพิ่มจำนวนการขนส่ง
    const updatedDriver = await Driver.findByIdAndUpdate(
      driverId,
      {
        status: 'available',
        activeOrder: null,
        $inc: { totalDeliveries: 1 },
        updatedAt: Date.now()
      },
      { new: true }
    );

    // ส่งข้อมูลการเสร็จสิ้นไปยัง RabbitMQ
    mqController.publishDeliveryCompletion({
      driverId,
      orderId,
      deliveryProof,
      timestamp: new Date()
    });

    // แจ้งเตือนผ่าน WebSocket
    io.emit('delivery_completed', {
      driverId,
      orderId,
      timestamp: new Date()
    });

    res.json({ 
      message: 'ขนส่งเสร็จสิ้นสำเร็จ',
      totalDeliveries: updatedDriver.totalDeliveries
    });
  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการเสร็จสิ้นการขนส่ง:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดที่เซิร์ฟเวอร์ขณะเสร็จสิ้นการขนส่ง' });
  }
};

// ดูโปรไฟล์คนขับ
exports.getProfile = async (req, res) => {
  try {
    const driver = await Driver.findById(req.driver.id).select('-__v');
    if (!driver) {
      return res.status(404).json({ message: 'ไม่พบข้อมูลคนขับ' });
    }
    res.json({ driver });
  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการดึงข้อมูลโปรไฟล์:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดที่เซิร์ฟเวอร์ขณะดึงข้อมูลโปรไฟล์' });
  }
};

// อัปเดตโปรไฟล์คนขับ
exports.updateProfile = async (req, res) => {
  try {
    const updateData = { ...req.body, updatedAt: Date.now() };
    
    // ลบฟิลด์ที่ไม่ควรอัปเดตด้วยวิธีนี้
    delete updateData.email;
    delete updateData.phone; 
    delete updateData.password;
    delete updateData.status;
    delete updateData.rating;
    delete updateData.totalDeliveries;
    delete updateData.activeOrder;
    delete updateData.currentLocation;
    
    const driver = await Driver.findByIdAndUpdate(
      req.driver.id,
      updateData,
      { new: true }
    );

    if (!driver) {
      return res.status(404).json({ message: 'ไม่พบข้อมูลคนขับ' });
    }

    res.json({ 
      message: 'อัปเดตโปรไฟล์สำเร็จ',
      driver
    });
  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการอัปเดตโปรไฟล์:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดที่เซิร์ฟเวอร์ขณะอัปเดตโปรไฟล์' });
  }
};