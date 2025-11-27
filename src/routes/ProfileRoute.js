import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
    getProfile,
    createOrUpdateProfile,
    deleteProfile,
    getuserdeatels
} from "../controllers/Profile.js";

const router = express.Router();
router.get("/me", protect, getProfile);
router.get("/getuserdeatels", protect, getuserdeatels);
router.post("/", protect, createOrUpdateProfile);
router.delete("/", protect, deleteProfile);

export default router;