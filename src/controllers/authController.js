
import { registerUser, loginUser, forgotPassword, changePassword, logoutUser } from "../services/authService.js";
import { logger } from "../config/logger.js";
import { verifyWhatsAppOtp } from "../utils/whatapp.js";
import { generateAccessToken, generateRefreshToken } from "../utils/authUtils.js";
import User from "../models/User.js";
export const register1 = async (req, res, next) => {
    try {
        const result = await registerUser(req.body);
        res.status(201).json(result);
    } catch (error) {
        next(error);
    }
};


export const verifyOtp = async (req, res, next) => {
    try {
        const { uid, otp, whatsappNumber } = req.body;

        logger.info("verifyOtp called with", { uid, whatsappNumber });

        if (!uid || !otp || !whatsappNumber) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields (uid, otp, whatsappNumber)"
            });
        }

        // Verify OTP using helper
        const result = await verifyWhatsAppOtp(uid, otp);

        logger.info("verifyOtp result", result);

        if (!result?.success) {
            return res.status(400).json({
                success: false,
                message: "OTP verification failed",
                details: result
            });
        }

        // Get user
        const user = await User.findOne({ whatsappNumber });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found with this WhatsApp number"
            });
        }

        // Generate tokens
        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        // Save refresh token in database
        user.refreshToken = refreshToken;
        await user.save();

        return res.status(200).json({
            success: true,
            message: "OTP verified successfully",
            data: {
                accessToken,
                refreshToken,
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    whatsappNumber: user.whatsappNumber
                }
            }
        });

    } catch (error) {
        logger.error("Error in verifyOtp:", error);
        return next(error);
    }
};


export const login1 = async (req, res, next) => {
    try {
        const result = await loginUser(req.body);
        res.json(result);
    } catch (error) {
        next(error);
    }
};

export const forgotPassword1 = async (req, res, next) => {
    try {
        const result = await forgotPassword(req.body);
        res.json(result);
    } catch (error) {
        next(error);
    }
};

export const changePassword1 = async (req, res, next) => {
    try {
        const result = await changePassword(req.body);
        res.json(result);
    } catch (error) {
        next(error);
    }
};

export const logout1 = async (req, res, next) => {
    try {
        const result = await logoutUser(req.user._id);
        res.json(result);
    } catch (error) {
        next(error);
    }
};
