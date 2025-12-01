import express from "express";
import {
    createBanner,
    getBanners,
    updateBanner,
    deleteBanner,
    toggleBannerStatus
} from "../controllers/banner.js";
import { upload } from "./ProfileRoute.js";

const router = express.Router();

router.post("/banner", upload.single("image"), createBanner);
router.get("/banners", getBanners);
router.put("/banner/:id", upload.single("image"), updateBanner);
router.delete("/banner/:id", deleteBanner);
router.patch("/banner/:id/toggle", toggleBannerStatus);

export default router;
