import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { logger } from "../utils/logger";


export const authenticateJWT = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.header("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ message: "Access denied. No token provided." });
    }

    const token = authHeader.split(" ")[1];
    
    // ตรวจสอบว่าเป็น SERVICE_TOKEN หรือไม่
    if (token === process.env.SERVICE_TOKEN) {
      // ถ้าเป็น SERVICE_TOKEN ให้ผ่านไปได้เลย (ไว้ใจได้เพราะมาจาก service)
      next();
      return;
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
      (req as any).user = decoded;
      next();
    } catch (error) {
      logger.error("JWT verification failed:", error);
      res.status(403).json({ message: "Invalid token" });
    }
  } catch (error) {
    logger.error("Error in auth middleware:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Middleware สำหรับตรวจสอบบทบาท
export const authorizeRoles = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!roles.includes((req as any).user.role)) {
      return res
        .status(403)
        .json({ message: "Access denied. Insufficient permissions." });
    }
    next();
  };
};