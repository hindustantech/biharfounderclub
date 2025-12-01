
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { config } from "../config/index.js";
import { logger } from "../config/logger.js";

export const protect = async (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "No token provided, authorization denied" });
        }

        const token = authHeader.split(" ")[1];

        // Verify token
        const decoded = jwt.verify(token, config.jwtSecret);

        // Get user from token
        const user = await User.findById(decoded.id).select("-password -refreshToken");
        if (!user) {
            return res.status(401).json({ message: "User not found, authorization denied" });
        }

        req.user = user; // attach user to request object
        next();
    } catch (error) {
        logger.error("Authentication error:", error);
        return res.status(401).json({ message: "Token is not valid or expired" });
    }
};

// ==========================
// Admin middleware
// Checks if user is admin
// ==========================
export const admin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: "User not authenticated" });
    }

    if (req.user.role !== "admin") {
        return res.status(403).json({ message: "Access denied: Admins only" });
    }

    next();
};
