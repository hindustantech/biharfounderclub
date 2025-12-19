// routes/bannerRoutes.js
import express from "express";
import {
    createBanner,
    getBanners,
    getBannerById,
    updateBanner,
    deleteBanner,
    toggleBannerStatus
} from "../controllers/banner.js";
import { upload } from "./ProfileRoute.js";
import { validateBanner } from "../middleware/validation.js";

const router = express.Router();

// Validation middleware
const validateCreate = validateBanner('create');
const validateUpdate = validateBanner('update');

// Routes - SIMPLIFIED
router.put("/:id", upload.single("image"), validateUpdate, updateBanner);
router.post('/', upload.single('image'), validateCreate, createBanner);  // Direct upload
router.get("/", getBanners);
router.get("/:id", getBannerById);
router.delete("/:id", deleteBanner);
router.patch("/:id/toggle", toggleBannerStatus);

export default router;