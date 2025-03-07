// server.js - ไฟล์หลักสำหรับเริ่มการทำงานของเซิร์ฟเวอร์

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const dotenv = require('dotenv');
const driverRoutes = require('./routes/driverRoutes');
const socketController = require('./controllers/socketController');
const mqController = require('./controllers/mqController');

// โหลดตัวแปรสภาพแวดล้อม
dotenv.config();

// เริ่มต้น Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// เชื่อมต่อ MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/logistics_platform', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('เชื่อมต่อ MongoDB สำเร็จ'))
.catch(err => console.error('ไม่สามารถเชื่อมต่อ MongoDB:', err));

// ตั้งค่าการเชื่อมต่อ socket.io
socketController.setup(io);

// ตั้งค่าการเชื่อมต่อ RabbitMQ
mqController.connectRabbitMQ()
  .then(() => {
    // ตั้งค่า RabbitMQ consumers หลังจากเชื่อมต่อสำเร็จ
    mqController.setupConsumers();
  })
  .catch(err => {
    console.error('ไม่สามารถตั้งค่า RabbitMQ:', err);
  });

// Routes
app.use('/api/drivers', driverRoutes);

// เริ่มเซิร์ฟเวอร์
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Driver service กำลังทำงานที่พอร์ต ${PORT}`);
});

// ส่งออก app และ io เพื่อใช้ในไฟล์อื่น
module.exports = { app, io };