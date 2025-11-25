
import express from "express";
import { register1, login1, forgotPassword1, changePassword1, logout1 } from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";
import { validate, registerSchema, loginSchema, forgotPasswordSchema, changePasswordSchema } from "../utils/validator.js";

const router = express.Router();

router.post("/register", validate(registerSchema), register1);
router.post("/login", validate(loginSchema), login1);
router.post("/forgot-password", validate(forgotPasswordSchema), forgotPassword1);
router.post("/change-password", validate(changePasswordSchema), changePassword1);
router.post("/logout", protect, logout1);

export default router;
