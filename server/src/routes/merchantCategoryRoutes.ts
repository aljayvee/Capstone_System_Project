import { Router } from "express";
import { listMerchantCategories, createMerchantCategory } from "../controllers/merchantCategoryController.js";
import { authenticateToken, requireRole } from "../middleware/auth.js";
import { readLimiter } from "../middleware/rateLimiters.js";

const router = Router();

router.get("/", authenticateToken, readLimiter, listMerchantCategories);
router.post("/", authenticateToken, requireRole(["OWNER"]), createMerchantCategory);

export default router;
