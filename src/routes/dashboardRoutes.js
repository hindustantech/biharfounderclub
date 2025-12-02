// routes/dashboardRoutes.js
import express from "express";
import {
    getDashboardStats,
    getDashboardStatsSimple
} from "../controllers/dashboardController.js";
import { protect,admin } from "../middleware/authMiddleware.js";
const router = express.Router();

// Get dashboard statistics (Admin only)
router.get("/stats", protect, admin, getDashboardStats);

// Alternative simplified version
router.get("/stats/simple", protect, admin, getDashboardStatsSimple);

export default router;