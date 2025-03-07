// models/driverModel.js - โมเดลข้อมูลคนขับ

const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, select: false }, // ในระบบจริงควรเข้ารหัสรหัสผ่าน
  licenseNumber: { type: String, required: true },
  licenseType: { type: String, required: true },
  licenseExpiry: { type: Date, required: true },
  vehicleType: { type: String, required: true },
  vehicleRegistration: { type: String, required: true },
  vehicleCapacity: { type: Number, required: true },
  currentLocation: {
    type: { type: String, default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] }
  },
  status: { 
    type: String, 
    enum: ['available', 'busy', 'offline', 'on_delivery'], 
    default: 'offline' 
  },
  rating: { type: Number, default: 0 },
  totalDeliveries: { type: Number, default: 0 },
  activeOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// สร้างดัชนีสำหรับการค้นหาเชิงพื้นที่
driverSchema.index({ currentLocation: '2dsphere' });

module.exports = mongoose.model('Driver', driverSchema);