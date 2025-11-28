import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
    getProfile,
    createOrUpdateProfile,
    deleteProfile,
    getuserdeatels
} from "../controllers/Profile.js";


import multer from "multer";


const router = express.Router();



const storage = multer.memoryStorage(); // buffer create

export const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

router.get("/me", protect, getProfile);
router.get("/getuserdeatels", protect, getuserdeatels);
router.post("/", protect,  upload.single("image"), createOrUpdateProfile);
router.delete("/", protect, deleteProfile);

export default router;