// routes/bannerRoutes.js
import express from "express";
import {
    createBanner,
    initiateChunkedUpload,
    getBanners,
    getBannerById,
    updateBanner,
    deleteBanner,
    toggleBannerStatus,
    getUploadProgress
} from "../controllers/banner.js";
import { upload } from "./ProfileRoute.js";
import { validateBanner } from "../middleware/validation.js";
import { chunkedUpload, handleChunkedUpload } from "../middleware/chunkedUpload.js";
const router = express.Router();

// Validation middleware
const validateCreate = validateBanner('create');
const validateUpdate = validateBanner('update');

// Routes

// Initiate chunked upload
router.post('/upload/initiate', initiateChunkedUpload);


// In banner routes
router.get('/upload/progress/:uploadId', getUploadProgress);
// Upload chunk
router.post('/upload/chunk', handleChunkedUpload, chunkedUpload, (req, res) => {
    res.json({
        success: true,
        message: 'Chunk uploaded successfully',
        uploadId: req.uploadId,
        chunkInfo: req.chunkInfo
    });
});

// Complete chunked upload and create banner
router.post('/upload/complete', validateCreate, createBanner);

// Direct upload (for smaller files)
router.post('/', chunkedUpload, validateCreate, createBanner);
router.get("/", getBanners);
router.get("/:id", getBannerById);
router.put("/:id", upload.single("image"), validateUpdate, updateBanner);
router.delete("/:id", deleteBanner);
router.patch("/:id/toggle", toggleBannerStatus);

export default router;
