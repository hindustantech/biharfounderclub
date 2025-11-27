import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
    createWhiteboard,
    updateWhiteboard,
    getWhiteboardsPaged,
    getWhiteboardById,
    deleteWhiteboard

} from "../controllers/Whiteboard.js";
const router = express.Router();

router.get("/paged", protect, getWhiteboardsPaged);
router.post("/createWhiteboard", protect, createWhiteboard);
router.post("/updateWhiteboard", protect, updateWhiteboard);
router.delete("/:id", protect, deleteWhiteboard);
router.get("/:id", protect, getWhiteboardById);
export default router;

