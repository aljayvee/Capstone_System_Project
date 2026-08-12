import { Router } from "express";
import authRoutes from "./authRoutes.js";
import userRoutes from "./userRoutes.js";
import customerRoutes from "./customerRoutes.js";
import errandRoutes from "./errandRoutes.js";
import riderRoutes from "./riderRoutes.js";
import customerLocationRoutes from "./customerLocationRoutes.js";
import merchantCategoryRoutes from "./merchantCategoryRoutes.js";
import rateConfigRoutes from "./rateConfigRoutes.js";

const router = Router();

router.use("/", authRoutes);
router.use("/users", userRoutes);
router.use("/customers", customerRoutes);
router.use("/errands", errandRoutes);
router.use("/riders", riderRoutes);
router.use("/customer-locations", customerLocationRoutes);
router.use("/merchant-categories", merchantCategoryRoutes);
router.use("/rate-config", rateConfigRoutes);

export default router;
