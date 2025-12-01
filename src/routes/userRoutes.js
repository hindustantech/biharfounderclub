import express from "express";
import { protect, admin } from "../middleware/authMiddleware.js";
import {
    createUser,
    getUsers,
    getUserById,
    updateUser,
    deleteUser,
} from "../controllers/userController.js";

const router = express.Router();

router.post("/", protect, admin, createUser);
router.get("/", protect, admin, getUsers);
router.get("/:id", protect, admin, getUserById);
router.put("/:id", protect, admin, updateUser);
router.delete("/:id", protect, admin, deleteUser);

export default router;
