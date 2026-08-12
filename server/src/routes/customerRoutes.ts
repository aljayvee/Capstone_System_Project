import { Router } from "express";
import { customerLogin, customerRegister } from "../controllers/authController.js";
import { getCustomerProfile, updateCustomerProfile, getCustomerTransactions } from "../controllers/customerController.js";
import { authenticateToken } from "../middleware/auth.js";
import { loginLimiter, userApiLimiter, readLimiter } from "../middleware/rateLimiters.js";

const router = Router();

// Literal routes MUST be declared before the /:id param routes below, otherwise
// Express would match "register"/"login" as an :id value.
router.post("/register", userApiLimiter, customerRegister);
router.post("/login", loginLimiter, customerLogin);

router.get("/:id", authenticateToken, readLimiter, getCustomerProfile);
router.put("/:id", authenticateToken, userApiLimiter, updateCustomerProfile);
router.get("/:id/transactions", authenticateToken, readLimiter, getCustomerTransactions);

export default router;
