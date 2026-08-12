import dotenv from "dotenv";

dotenv.config();

// Ensure required environment variables exist (Fail fast per security standards)
if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
  throw new Error("FATAL: JWT_SECRET or JWT_REFRESH_SECRET missing from environment variables.");
}

export const PORT = process.env.PORT || 5000;
export const JWT_SECRET = process.env.JWT_SECRET;
export const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1h";
export const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "7d";

export const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim())
  : ["http://localhost:5173", "http://localhost:8081"];
