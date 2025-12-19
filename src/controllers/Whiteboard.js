import Whiteboard from "../models/whiteboard.js";
import Profile from "../models/Profile.js";
import { logger } from "../config/logger.js";
import mongoose from "mongoose";
import {
    processImage,
    uploadToCloudinary,
    validateImage,
    generateUniqueFilename,
} from "../config/imageUpload.js";

export const createWhiteboard = async (req, res, next) => {
    try {
        const { category, title, description, websiteUrl } = req.body;
        logger.info("data boady",{ category, title, description, websiteUrl })
        // Basic validation
        if (!category || !title || !description || !websiteUrl) {
            return res.status(400).json({
                message: "Category, title, description and websiteUrl are required",
            });
        }

        let imageData = null;

        // 🖼️ If image is provided
        if (req.file) {
            // 1️⃣ Validate image
            const validation = await validateImage(req.file.buffer, {
                minWidth: 300,
                minHeight: 300,
                maxWidth: 5000,
                maxHeight: 5000,
                maxFileSize: 10 * 1024 * 1024, // 10MB
            });

            if (!validation.isValid) {
                return res.status(400).json({
                    message: validation.error,
                });
            }

            // 2️⃣ Optimize image
            const optimizedBuffer = await processImage(req.file.buffer);

            // 3️⃣ Upload to Cloudinary
            const uploaded = await uploadToCloudinary(
                optimizedBuffer,
                "whiteboards",
                {
                    public_id: generateUniqueFilename(
                        req.file.originalname,
                        optimizedBuffer
                    ),
                }
            );

            imageData = {
                url: uploaded.url,
                publicId: uploaded.publicId,
                width: uploaded.width,
                height: uploaded.height,
                bytes: uploaded.bytes,
                format: uploaded.format,
            };
        }

        // 4️⃣ Save Whiteboard
        const post = await Whiteboard.create({
            category,
            title,
            description,
            websiteurl: websiteUrl,
            image: imageData, // can be null
            createdBy: req.user.id,
        });

        res.status(201).json({
            message: "Whiteboard post created successfully",
            data: post,
        });
    } catch (error) {
        next(error);
    }
};

const buildPaginationPipeline = (category, page, limit) => {
    const skip = (page - 1) * limit;

    return {
        data: [
            { $match: { category, status: "active" } }, // ✅ Only get active
            { $sort: { createdAt: -1 } },

            // Join with Profile
            {
                $lookup: {
                    from: "profiles",
                    localField: "createdBy",
                    foreignField: "userId",
                    as: "creatorProfile",
                },
            },
            { $unwind: { path: "$creatorProfile", preserveNullAndEmptyArrays: true } },
                    
            {
                $project: {
                    title: 1,
                    description: 1,
                    category: 1,
                    image:1,
                    websiteUrl: "$websiteurl", // ✅ corrected field name
                    createdAt: 1,
                    updatedAt: 1,
                    creator: {
                        image: "$creatorProfile.image",
                        email: "$creatorProfile.email",
                        linkedinUrl: "$creatorProfile.linkedinUrl",
                        websiteUrl: "$creatorProfile.websiteUrl",
                    },
                },
            },
            { $skip: skip },
            { $limit: limit },
        ],

        count: [
            { $match: { category, status: "active" } }, // ✅ Match only active for count
            { $count: "total" },
        ],
    };
};


export const getWhiteboardsPaged = async (req, res, next) => {
    try {
        const {
            snPage = 1,
            snLimit = 10,
            swPage = 1,
            swLimit = 10,
            soPage = 1,
            soLimit = 10,
        } = req.query;

        const pipelines = {
            startup_news: buildPaginationPipeline("startup_news", Number(snPage), Number(snLimit)),
            services_wanted: buildPaginationPipeline("services_wanted", Number(swPage), Number(swLimit)),
            services_offering: buildPaginationPipeline("services_offering", Number(soPage), Number(soLimit))
        };

        const facetStage = {
            $facet: {
                startup_news: pipelines.startup_news.data,
                startup_news_count: pipelines.startup_news.count,

                services_wanted: pipelines.services_wanted.data,
                services_wanted_count: pipelines.services_wanted.count,

                services_offering: pipelines.services_offering.data,
                services_offering_count: pipelines.services_offering.count,
            }
        };

        const result = await Whiteboard.aggregate([facetStage]);

        const format = (cat, page, limit) => ({
            data: result[0][cat],
            total: result[0][`${cat}_count`][0]?.total || 0,
            page,
            limit,
        });

        res.status(200).json({
            success: true,
            data: {
                startup_news: format("startup_news", Number(snPage), Number(snLimit)),
                services_wanted: format("services_wanted", Number(swPage), Number(swLimit)),
                services_offering: format("services_offering", Number(soPage), Number(soLimit)),
            }
        });

    } catch (error) {
        console.error("Whiteboard Pagination Error:", error);
        next(error);
    }
};



export const getWhiteboardById = async (req, res, next) => {
    try {
        const { id } = req.params;

        const objectId = new mongoose.Types.ObjectId(id);

        // Build aggregation pipeline for single whiteboard
        const pipeline = [
            { $match: { _id: objectId, status: "active" } },

            // Join with Profile collection
            {
                $lookup: {
                    from: "profiles",
                    localField: "createdBy",
                    foreignField: "userId",
                    as: "creatorProfile",
                },
            },
            { $unwind: { path: "$creatorProfile", preserveNullAndEmptyArrays: true } },

            // Project only useful fields
            {
                $project: {
                    _id: 1,
                    title: 1,
                    description: 1,
                    category: 1,
                    websiteUrl: "$websiteurl",
                    createdAt: 1,
                    updatedAt: 1,
                    creator: {
                        email: "$creatorProfile.email",
                        image: "$creatorProfile.image",
                        linkedinUrl: "$creatorProfile.linkedinUrl",
                        websiteUrl: "$creatorProfile.websiteUrl",
                    },
                },
            },
        ];

        const result = await Whiteboard.aggregate(pipeline);

        if (!result || result.length === 0) {
            return res.status(404).json({ success: false, message: "Post not found" });
        }

        res.status(200).json(result[0]);
    } catch (error) {
        console.error("Whiteboard Fetch Error:", error);
        next(error);
    }
};


export const deleteWhiteboard = async (req, res, next) => {
    try {
        const post = await Whiteboard.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }

        // Check if the user is the creator
        if (post.createdBy.toString() !== req.user.id) {
            return res.status(403).json({ message: "Unauthorized" });
        }
        await post.remove();
        res.status(200).json({ message: "Post deleted successfully" });
    } catch (error) {
        next(error);
    }
};


export const updateWhiteboard = async (req, res, next) => {
    try {
        const post = await Whiteboard.findById(req.params.id);

        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }

        // 🔐 Authorization
        if (post.createdBy.toString() !== req.user.id) {
            return res.status(403).json({ message: "Unauthorized to update this post" });
        }

        let imageData = post.image || null;

        // 🖼️ If new image is uploaded
        if (req.file) {
            // 1️⃣ Validate image
            const validation = await validateImage(req.file.buffer, {
                minWidth: 300,
                minHeight: 300,
                maxWidth: 5000,
                maxHeight: 5000,
                maxFileSize: 10 * 1024 * 1024, // 10MB
            });

            if (!validation.isValid) {
                return res.status(400).json({
                    message: validation.error,
                });
            }

            // 2️⃣ Optimize image
            const optimizedBuffer = await processImage(req.file.buffer);

            // 3️⃣ Upload new image
            const uploaded = await uploadToCloudinary(
                optimizedBuffer,
                "whiteboards",
                {
                    public_id: generateUniqueFilename(
                        req.file.originalname,
                        optimizedBuffer
                    ),
                }
            );

            // 4️⃣ Delete old image (if exists)
            if (post.image?.publicId) {
                await deleteFromCloudinary(post.image.publicId);
            }

            imageData = {
                url: uploaded.url,
                publicId: uploaded.publicId,
                width: uploaded.width,
                height: uploaded.height,
                bytes: uploaded.bytes,
                format: uploaded.format,
            };
        }

        // 📝 Update fields (partial update)
        const updates = {
            category: req.body.category ?? post.category,
            title: req.body.title ?? post.title,
            description: req.body.description ?? post.description,
            websiteurl: req.body.websiteurl ?? post.websiteurl,
            image: imageData,
        };

        const updatedPost = await Whiteboard.findByIdAndUpdate(
            req.params.id,
            updates,
            { new: true, runValidators: true }
        );

        res.status(200).json({
            message: "Post updated successfully",
            data: updatedPost,
        });
    } catch (error) {
        next(error);
    }
};

