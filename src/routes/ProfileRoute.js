
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




const router = express.Router();

// Apply authentication middleware to all routes
router.use(protect);

const storage = multer.memoryStorage(); // buffer create

const upload = multer({
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type'));
        }
    }
});

// Routes
router.get("/me", getProfile);
router.get("/user-details", getUserDetails);
router.post("/", upload.single("image"), createOrUpdateProfile);
router.delete("/", deleteProfile);
router.delete("/image", deleteProfileImage);
router.patch("/image", upload.single("image"), updateProfileImage);

export default router;