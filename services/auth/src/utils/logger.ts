import winston from "winston";

// กำหนดรูปแบบของ Log
const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.printf(({ timestamp, level, message }) => {
    return `${timestamp} [${level.toUpperCase()}]: ${message}`;
  })
);

// สร้าง Logger
export const logger = winston.createLogger({
  level: "info", // ค่าเริ่มต้นของ Log Level ("info", "warn", "error", "debug")
  format: logFormat,
  transports: [
    new winston.transports.Console({ format: winston.format.simple() }),
    new winston.transports.File({ filename: "logs/error.log", level: "error" }), // บันทึกเฉพาะ error
    new winston.transports.File({ filename: "logs/combined.log" }) // บันทึก log ทั้งหมด
  ],
});

// ฟังก์ชันสำหรับแสดง Log ใน Console ขณะ Dev Mode
if (process.env.NODE_ENV !== "production") {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}
