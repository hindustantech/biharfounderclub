
import User from "../models/User.js";
import { generateAccessToken, generateRefreshToken, generateOTP } from "../utils/authUtils.js";
import { sendOTP } from "../utils/emailUtils.js";
import { logger } from "../config/logger.js";
import { sendWhatsAppOtp, verifyWhatsAppOtp } from "../utils/whatapp.js";

export const registerUser = async ({
    fullName,
    whatsappNumber,
    pan,
    password
}) => {

    if (!fullName || !whatsappNumber || !pan || !password) {
        throw new Error("Missing required fields");
    }

    // check if user exists using whatsapp or pan
    const existingUser = await User.findOne({
        $or: [{ whatsappNumber }, { pan }]
    });

    if (existingUser) {
        throw Object.assign(
            new Error("User already exists with this WhatsApp number or PAN"),
            { statusCode: 400 }
        );
    }

    // generate OTP for verification
    const sendOTP = await sendWhatsAppOtp(whatsappNumber);

    logger.info("sendOTP", sendOTP.data);
    if (!sendOTP.success) {
        throw Object.assign(new Error("Failed to send WhatsApp OTP"), { statusCode: 500 });
    }

    const user = new User({
        fullName,
        whatsappNumber,
        pan,
        password,
        otpExpires: new Date(Date.now() + 10 * 60 * 1000) // OTP valid for 10 minutes
    });


    await user.save();



    return {
        message: "User registered, OTP sent to WhatsApp number",
        data: sendOTP
    };
};


export const loginUser = async ({ whatsappNumber, password }) => {
    const user = await User.findOne({ whatsappNumber });

    if (!user || !(await user.comparePassword(password))) {
        throw Object.assign(new Error("Invalid WhatsApp number or password"), {
            statusCode: 401
        });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    user.refreshToken = refreshToken;
    await user.save();

    return { accessToken, refreshToken, user };
};





export const forgotPassword = async ({ whatsappNumber }) => {
    const user = await User.findOne({ whatsappNumber });

    if (!user) {
        throw Object.assign(new Error("User not found"), { statusCode: 404 });
    }

    // Send OTP using WhatsApp API
    const resp = await sendWhatsAppOtp(whatsappNumber);

    if (!resp.success) {
        throw Object.assign(new Error("Failed to send WhatsApp OTP"), { statusCode: 500 });
    }

    // UID returned from WhatsApp API
    const uid = resp?.data || resp?.data?.data;

    if (!uid) {
        throw Object.assign(new Error("UID not returned by API"), { statusCode: 500 });
    }

    // Save UID for verification
    user.uid = uid;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // optional expiry

    await user.save();

    return {
        success: true,
        message: "OTP sent to WhatsApp",
        uid,
    };
};



export const changePassword = async ({ whatsappNumber, uid, otp, newPassword }) => {
    const user = await User.findOne({ whatsappNumber });

    if (!user) {
        throw Object.assign(new Error("Invalid UID"), { statusCode: 400 });
    }

    // Optional expiry check
    if (!user.otpExpires || user.otpExpires < Date.now()) {
        throw Object.assign(new Error("OTP expired"), { statusCode: 400 });
    }

    // Verify OTP using WhatsApp API
    const verify = await verifyWhatsAppOtp(uid, otp);
    logger.info("changePassword verify", verify);

    if (!verify.success) {
        throw Object.assign(new Error("Invalid OTP"), { statusCode: 400 });
    }

    // Update password
    user.password = newPassword;

    // Clear verification fields
    user.uid = null;
    user.otpExpires = null;

    await user.save();

    return { message: "Password changed successfully" };
};


export const logoutUser = async (userId) => {
    const user = await User.findById(userId);
    if (user) {
        user.refreshToken = null;
        await user.save();
    }
    return { message: "Logged out successfully" };
};
