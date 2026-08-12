import { Router } from "express";
import { getRateConfig, updateRateConfig } from "../controllers/rateConfigController.js";
import { authenticateToken, requireRole } from "../middleware/auth.js";
import { readLimiter } from "../middleware/rateLimiters.js";

const router = Router();

router.get("/", authenticateToken, readLimiter, getRateConfig);
router.put("/", authenticateToken, requireRole(["OWNER"]), updateRateConfig);

export default router;
