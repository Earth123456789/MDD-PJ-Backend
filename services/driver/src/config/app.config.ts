import dotenv from "dotenv";

dotenv.config();

interface AppConfig {
  port: number;
  environment: string;
  databaseUrl: string;
}

const config: AppConfig = {
  port: parseInt(process.env.PORT || "3001", 10),
  environment: process.env.NODE_ENV || "development",
  databaseUrl: process.env.DATABASE_URL || "",
};

export default config;
