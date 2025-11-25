
import { registerUser, loginUser, forgotPassword, changePassword, logoutUser } from "../services/authService.js";
import { logger } from "../config/logger.js";

export const register1 = async (req, res, next) => {
    try {
        const result = await registerUser(req.body);
        res.status(201).json(result);
    } catch (error) {
        next(error);
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
