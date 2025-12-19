import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
    createWhiteboard,
    updateWhiteboard,
    getWhiteboardsPaged,
    getWhiteboardById,
    deleteWhiteboard

} from "../controllers/Whiteboard.js";
import multer from "multer";

const router = express.Router();

export const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
    },
});
router.get("/paged", getWhiteboardsPaged);
router.post("/createWhiteboard", protect, upload.single("image"), createWhiteboard);
router.post("/updateWhiteboard/:id", protect, upload.single("image"), updateWhiteboard);
router.delete("/:id", protect, deleteWhiteboard);
router.get("/:id", protect, getWhiteboardById);
export default router;

