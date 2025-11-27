
import express from "express";
import { register1, login1, forgotPassword1, changePassword1, logout1,verifyOtp } from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";
import { validate, registerSchema, loginSchema, forgotPasswordSchema, changePasswordSchema } from "../utils/validator.js";

const router = express.Router();

router.post("/register", register1);
router.post("/verifyOtp", verifyOtp);
router.post("/login", login1);
router.post("/forgot-password", forgotPassword1);
router.post("/change-password",  changePassword1);
router.post("/logout", protect, logout1);

export default router;
