import User from "../models/User.js";
import bcrypt from "bcryptjs";
import { Parser } from "json2csv"; // For CSV export

// ==========================
// Create a new user (Admin)
// ==========================
export const createUser = async (req, res, next) => {
    try {
        const { fullName, whatsappNumber, pan, password, role } = req.body;

        if (!fullName || !whatsappNumber || !pan || !password) {
            return res.status(400).json({ message: "All required fields must be provided" });
        }

        // Check if PAN already exists
        const existingUser = await User.findOne({ pan: pan.toUpperCase() });
        if (existingUser) {
            return res.status(400).json({ message: "User with this PAN already exists" });
        }

        const newUser = new User({
            fullName,
            whatsappNumber,
            pan,
            password,
            role: role || "user",
        });

        await newUser.save();

        res.status(201).json({ message: "User created successfully", user: newUser });
    } catch (error) {
        next(error);
    }
};

// ==========================
// Get all users (Admin)
// ==========================
export const getUsers = async (req, res, next) => {
    try {
        let { page = 1, limit = 10, search = "", download = false } = req.query;
        page = parseInt(page);
        limit = parseInt(limit);

        // Build search query
        const query = {
            $or: [
                { fullName: { $regex: search, $options: "i" } },
                { whatsappNumber: { $regex: search, $options: "i" } },
                { pan: { $regex: search, $options: "i" } },
                { role: { $regex: search, $options: "i" } },
            ],
        };

        // If download is true, return all data as CSV
        if (download === "true") {
            const users = await User.find(query).select("-password -refreshToken -__v");
            if (!users.length) return res.status(404).json({ message: "No users found" });

            // Convert JSON to CSV
            const fields = ["fullName", "whatsappNumber", "pan", "role", "isVerified", "showMentroshipSection", "createdAt"];
            const parser = new Parser({ fields });
            const csv = parser.parse(users);

            res.header("Content-Type", "text/csv");
            res.attachment("users.csv");
            return res.send(csv);
        }

        // Pagination
        const total = await User.countDocuments(query);
        const users = await User.find(query)
            .select("-password -refreshToken -__v")
            .skip((page - 1) * limit)
            .limit(limit)
            .sort({ createdAt: -1 });

        res.status(200).json({
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            totalUsers: total,
            users,
        });
    } catch (error) {
        next(error);
    }
};

// ==========================
// Get single user by ID (Admin)
// ==========================
export const getUserById = async (req, res, next) => {
    try {
        const { id } = req.params;

        const user = await User.findById(id).select("-password -refreshToken");
        if (!user) return res.status(404).json({ message: "User not found" });

        res.status(200).json({ user });
    } catch (error) {
        next(error);
    }
};

// ==========================
// Update user by ID (Admin)
// ==========================
export const updateUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { fullName, whatsappNumber, pan, password, role, isVerified, showMentroshipSection } = req.body;

        const user = await User.findById(id);
        if (!user) return res.status(404).json({ message: "User not found" });

        // Update fields if provided
        if (fullName) user.fullName = fullName;
        if (whatsappNumber) user.whatsappNumber = whatsappNumber;
        if (pan) user.pan = pan.toUpperCase();
        if (role) user.role = role;
        if (typeof isVerified === "boolean") user.isVerified = isVerified;
        if (typeof showMentroshipSection === "boolean") user.showMentroshipSection = showMentroshipSection;
        if (password) {
            user.password = await bcrypt.hash(password, 10);
        }

        await user.save();
        res.status(200).json({ message: "User updated successfully", user });
    } catch (error) {
        next(error);
    }
};

// ==========================
// Delete user by ID (Admin)
// ==========================
export const deleteUser = async (req, res, next) => {
    try {
        const { id } = req.params;

        const user = await User.findById(id);
        if (!user) return res.status(404).json({ message: "User not found" });

        await user.deleteOne();
        res.status(200).json({ message: "User deleted successfully" });
    } catch (error) {
        next(error);
    }
};
