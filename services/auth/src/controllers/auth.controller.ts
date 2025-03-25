import { Request, Response } from "express";
import { registerUser, loginUser } from "../services/auth.service";
import { logger } from "../utils/logger";

// ✅ Register Controller
export const register = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const user = await registerUser(email, password);
    res.status(201).json({ message: "User registered successfully", user });
  } catch (error) {
    logger.error("Error during registration: " + error);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Login Controller
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const { token, refreshToken } = await loginUser(email, password);
    res.json({ token, refreshToken });
  } catch (error) {
    logger.error("Error during login: " + error);
    res.status(401).json({ message: "Invalid email or password" });
  }
};
