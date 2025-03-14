import express from 'express';
import cargoRoutes from './routes/cargo.routes';  // นำเข้า Cargo Routes
import cargoTrackingRoutes from './routes/cargoTracking.routes'; // นำเข้า Cargo Tracking Routes

const app = express();
const PORT = process.env.PORT || 3000;

// ใช้ JSON body parser เพื่อแปลงข้อมูล JSON ที่ส่งมาจาก Client
app.use(express.json());

// ใช้ Cargo Routes สำหรับ API ของ Cargo
app.use('/api/cargo', cargoRoutes);

// ใช้ Cargo Tracking Routes สำหรับ API ของการติดตาม Cargo
app.use('/api/cargo', cargoTrackingRoutes);  // หากต้องการแยก routes ให้ใช้ "/api/cargo/tracking" ได้

// เริ่มต้นเซิร์ฟเวอร์ที่พอร์ต 3000 (หรือพอร์ตที่กำหนดใน environment variable)
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
