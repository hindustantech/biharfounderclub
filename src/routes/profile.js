import express from "express";
import ProfileController from "../controllers/ProfileC.js";
import { protect, admin } from "../middleware/authMiddleware.js";

const router = express.Router();

// Get all profiles with filters
router.get("/profiles", protect, admin, ProfileController.getAllProfiles);

// Get profile by ID
router.get("/profiles/:id", protect, admin, ProfileController.getProfileById);

// Update profile
router.put("/profiles/:id", protect, admin, ProfileController.updateProfile);

// Delete profile
router.delete("/profiles/:id", protect, admin, ProfileController.deleteProfile);

// Toggle mentor section visibility
router.patch("/profiles/:id/toggle-mentor", protect, admin, ProfileController.toggleMentorSection);

// Export profiles to CSV
router.get("/profiles/export/csv", protect, admin, ProfileController.exportProfilesToCSV);

// Get all mentors (Public)
router.get("/mentors", ProfileController.getAllMentors);

export default router;
