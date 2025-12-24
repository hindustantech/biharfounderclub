import express from 'express';
import { createMentorRequest } from '../controllers/mentrorequest.js';
import { protect } from '../middleware/authMiddleware.js';
const router = express.Router();

router.post('/', protect, createMentorRequest);

export default router;      