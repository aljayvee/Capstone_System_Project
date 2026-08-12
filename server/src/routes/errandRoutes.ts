import { Router } from "express";
import {
  listErrands,
  getErrandById,
  listErrandsForUser,
  listErrandsForRider,
  createErrand,
  claimErrand,
  acceptErrand,
  assignRider,
  updateStatus,
  declineErrand,
  setPinpoints,
} from "../controllers/errandController.js";
import { authenticateToken, requireRole } from "../middleware/auth.js";
import { userApiLimiter, readLimiter } from "../middleware/rateLimiters.js";

const router = Router();

// GET /api/errands - Fetch all errands (Owner/Dispatcher view)
router.get("/", authenticateToken, requireRole(["OWNER", "DISPATCHER"]), readLimiter, listErrands);

// GET /api/errands/:id - Fetch single errand details by ID
router.get("/:id", authenticateToken, readLimiter, getErrandById);

// GET /api/errands/user/:userId - Fetch active errands for a specific customer
router.get("/user/:userId", authenticateToken, readLimiter, listErrandsForUser);

// GET /api/errands/rider/:riderId - Fetch errands assigned to a specific rider
router.get("/rider/:riderId", authenticateToken, readLimiter, listErrandsForRider);

// POST /api/errands - Create a new 3NF errand (Customer App)
router.post("/", authenticateToken, userApiLimiter, createErrand);

// PATCH /api/errands/:id/claim - Claim an errand (Dispatcher)
router.patch("/:id/claim", authenticateToken, requireRole(["OWNER", "DISPATCHER"]), claimErrand);

// POST /api/errands/:id/accept - Rider accepts an errand assigned to them
router.post("/:id/accept", authenticateToken, requireRole(["RIDER"]), userApiLimiter, acceptErrand);

// POST /api/errands/:id/decline - Rider declines an errand assigned to them
// (un-assigns, reverts to PENDING so the dispatcher can reassign)
router.post("/:id/decline", authenticateToken, requireRole(["RIDER"]), userApiLimiter, declineErrand);

// POST /api/errands/:id/pinpoints - Dispatcher sets/replaces store pinpoints (max 3)
router.post(
  "/:id/pinpoints",
  authenticateToken,
  requireRole(["OWNER", "DISPATCHER"]),
  userApiLimiter,
  setPinpoints
);

// POST /api/errands/:id/assign-rider - Assign Rider to Errand
router.post(
  "/:id/assign-rider",
  authenticateToken,
  requireRole(["OWNER", "DISPATCHER"]),
  userApiLimiter,
  assignRider
);

// PATCH /api/errands/:id/status - Update errand status
router.patch(
  "/:id/status",
  authenticateToken,
  requireRole(["OWNER", "DISPATCHER", "RIDER"]),
  userApiLimiter,
  updateStatus
);

export default router;
