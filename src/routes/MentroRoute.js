// routes/mentorRoutes.js
import express from 'express';


import {
    getMentors,
    getMentorById,
    getExpertiseList,
    getMentorStats
} from '../controllers/mentorController.js';
const router = express.Router();

// Public routes
router.get('/', getMentors);
router.get('/expertise', getExpertiseList);
router.get('/stats', getMentorStats);
router.get('/:id', getMentorById);

export default router;