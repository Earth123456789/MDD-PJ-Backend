import jwt from "jsonwebtoken";
import * as fs from "fs";
import { logger } from "../utils/logger";

// โหลด Private & Public Key
const privateKey = fs.readFileSync("private.key", "utf8");
const publicKey = fs.readFileSync("public.key", "utf8");

const JWT_EXPIRES_IN = "1h";
const REFRESH_EXPIRES_IN = "7d";

export class TokenService {
  /**
   * ✅ สร้าง Access Token (RS256)
   */
  static generateToken(userId: string, email: string) {
    return jwt.sign({ userId, email }, privateKey, {
      algorithm: "RS256",
      expiresIn: JWT_EXPIRES_IN,
    });
  }

  /**
   * ✅ สร้าง Refresh Token (RS256)
   */
  static generateRefreshToken(userId: string) {
    return jwt.sign({ userId }, privateKey, {
      algorithm: "RS256",
      expiresIn: REFRESH_EXPIRES_IN,
    });
  }

  /**
   * ✅ ตรวจสอบ JWT Token
   */
  static verifyToken(token: string) {
    try {
      return jwt.verify(token, publicKey, { algorithms: ["RS256"] });
    } catch (error) {
      logger.error("Invalid or expired token:", error);
      throw new Error("Invalid token");
    }
  }
}
