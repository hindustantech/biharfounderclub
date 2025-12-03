










// routes/profileRoutes.js
import express from "express";
import { 
    getProfile, 
    getUserDetails, 
    createOrUpdateProfile, 
    deleteProfile,
    deleteProfileImage,
    updateProfileImage 
} from "../controllers/Profile.js";
import multer from "multer";

import { protect } from "../middleware/authMiddleware.js";


import { upload } from "../middleware/uploadMiddleware.js";
import { validateProfile } from "../middleware/validation.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(protect);
    
const storage = multer.memoryStorage(); // buffer create

export const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// Routes
router.get("/", getProfile);
router.get("/user-details", getUserDetails);
router.post("/", upload.single("image"), validateProfile, createOrUpdateProfile);
router.delete("/", deleteProfile);
router.delete("/image", deleteProfileImage);
router.patch("/image", upload.single("image"), updateProfileImage);

export default router;