import { z } from "zod";

// Schema สำหรับตรวจสอบข้อมูลการลงทะเบียน
export const registerSchema = z.object({
  email: z.string().email({ message: "รูปแบบอีเมลไม่ถูกต้อง" }),
  password: z
    .string()
    .min(8, { message: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร" })
    .regex(/[A-Z]/, { message: "รหัสผ่านต้องมีตัวอักษรพิมพ์ใหญ่อย่างน้อย 1 ตัว" })
    .regex(/[a-z]/, { message: "รหัสผ่านต้องมีตัวอักษรพิมพ์เล็กอย่างน้อย 1 ตัว" })
    .regex(/[0-9]/, { message: "รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว" })
    .regex(/[\W_]/, { message: "รหัสผ่านต้องมีอักขระพิเศษอย่างน้อย 1 ตัว" }),
  fullName: z.string().optional(),
  role: z.enum(["customer", "driver", "admin"]).optional().default("customer"),
});

// Schema สำหรับตรวจสอบข้อมูลการเข้าสู่ระบบ
export const loginSchema = z.object({
  email: z.string().email({ message: "รูปแบบอีเมลไม่ถูกต้อง" }),
  password: z.string().min(1, { message: "กรุณาระบุรหัสผ่าน" }),
});

// Schema สำหรับตรวจสอบการต่ออายุ token
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, { message: "กรุณาระบุ refresh token" }),
});

// Schema สำหรับตรวจสอบการรีเซ็ตรหัสผ่าน
export const forgotPasswordSchema = z.object({
  email: z.string().email({ message: "รูปแบบอีเมลไม่ถูกต้อง" }),
});

// Schema สำหรับตรวจสอบการยืนยันการรีเซ็ตรหัสผ่าน
export const resetPasswordSchema = z.object({
  token: z.string().min(1, { message: "กรุณาระบุ token" }),
  password: z
    .string()
    .min(8, { message: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร" })
    .regex(/[A-Z]/, { message: "รหัสผ่านต้องมีตัวอักษรพิมพ์ใหญ่อย่างน้อย 1 ตัว" })
    .regex(/[a-z]/, { message: "รหัสผ่านต้องมีตัวอักษรพิมพ์เล็กอย่างน้อย 1 ตัว" })
    .regex(/[0-9]/, { message: "รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว" })
    .regex(/[\W_]/, { message: "รหัสผ่านต้องมีอักขระพิเศษอย่างน้อย 1 ตัว" }),
});