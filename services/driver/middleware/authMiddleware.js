// middleware/authMiddleware.js - มิดเดิลแวร์สำหรับการยืนยันตัวตน

const jwt = require('jsonwebtoken');

exports.authenticateDriver = (req, res, next) => {
  const token = req.header('x-auth-token');
  if (!token) return res.status(401).json({ message: 'การเข้าถึงถูกปฏิเสธ ไม่พบโทเคน' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    req.driver = decoded;
    next();
  } catch (ex) {
    res.status(400).json({ message: 'โทเคนไม่ถูกต้อง' });
  }
};