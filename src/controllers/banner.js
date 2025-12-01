import Banner from "../models/banner.js";
import { uploadToCloudinary } from "../config/imageUpload.js";


/**
 * CREATE NEW BANNER
 */
export const createBanner = async (req, res) => {
    try {
        const { title, link, email, phoneNumber, description, isActive = true } = req.body;

        // Validation
        if (!title || !title.trim()) {
            return res.status(400).json({
                success: false,
                message: "Title is required",
                errors: { title: "Title cannot be empty" }
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Banner image is required",
                errors: { image: "Please upload an image" }
            });
        }

        // Validate file type
        const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
        if (!validTypes.includes(req.file.mimetype)) {
            return res.status(400).json({
                success: false,
                message: "Invalid file type",
                errors: { image: "Only JPEG, PNG, WEBP, and GIF images are allowed" }
            });
        }

        // Validate file size (5MB max)
        const maxSize = 5 * 1024 * 1024;
        if (req.file.size > maxSize) {
            return res.status(400).json({
                success: false,
                message: "File too large",
                errors: { image: "Image must be less than 5MB" }
            });
        }

        // Upload image
        let imageUrl;
        try {
            imageUrl = await uploadToCloudinary(req.file.buffer, "banners");
        } catch (uploadError) {
            console.error("Cloudinary upload error:", uploadError);
            return res.status(500).json({
                success: false,
                message: "Failed to upload image to storage",
                error: uploadError.message
            });
        }

        // Process links
        let linkArray = [];
        if (link && typeof link === "string") {
            linkArray = link
                .split(",")
                .map(l => l.trim())
                .filter(l => {
                    // Basic URL validation
                    try {
                        new URL(l);
                        return true;
                    } catch {
                        return false;
                    }
                });
        }

        // Validate email if provided
        if (email && email.trim()) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                // Clean up uploaded image if email is invalid
                // await deleteFromCloudinary(imageUrl);
                return res.status(400).json({
                    success: false,
                    message: "Invalid email format",
                    errors: { email: "Please enter a valid email address" }
                });
            }
        }

        // Create new banner
        const newBanner = new Banner({
            title: title.trim(),
            description: description?.trim() || "",
            imageUrl,
            link: linkArray,
            email: email?.trim() || "",
            phoneNumber: phoneNumber?.trim() || "",
            isActive: isActive === "true" || isActive === true
        });

        const savedBanner = await newBanner.save();

        res.status(201).json({
            success: true,
            message: "Banner created successfully",
            data: savedBanner
        });

    } catch (error) {
        console.error("Error creating banner:", error);

        // Handle duplicate key errors
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: "A banner with this title already exists",
                error: "Duplicate title"
            });
        }

        // Handle validation errors
        if (error.name === "ValidationError") {
            const errors = Object.values(error.errors).reduce((acc, curr) => {
                acc[curr.path] = curr.message;
                return acc;
            }, {});

            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors
            });
        }

        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
};

/**
 * GET ALL BANNERS
 */
export const getBanners = async (req, res) => {
    try {
        const { activeOnly, search, page = 1, limit = 10 } = req.query;
        const query = {};

        // Filter by active status
        if (activeOnly === "true") query.isActive = true;

        // Search functionality
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: "i" } },
                { description: { $regex: search, $options: "i" } }
            ];
        }

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        // Get total count for pagination
        const total = await Banner.countDocuments(query);

        // Get banners with pagination
        const banners = await Banner.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum);

        res.status(200).json({
            success: true,
            message: "Banners fetched successfully",
            data: banners,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum)
            }
        });

    } catch (error) {
        console.error("Error fetching banners:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch banners",
            error: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
};

/**
 * GET SINGLE BANNER
 */
export const getBannerById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                message: "Invalid banner ID format"
            });
        }

        const banner = await Banner.findById(id);

        if (!banner) {
            return res.status(404).json({
                success: false,
                message: "Banner not found"
            });
        }

        res.status(200).json({
            success: true,
            data: banner
        });

    } catch (error) {
        console.error("Error fetching banner:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch banner",
            error: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
};

/**
 * UPDATE BANNER
 */
export const updateBanner = async (req, res) => {
    try {
        
        const { id } = req.params;
        const { title, link, email, phoneNumber, description, isActive } = req.body;

        // Validate ID
        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                message: "Invalid banner ID format"
            });
        }

        // Find existing banner
        const existingBanner = await Banner.findById(id);
        if (!existingBanner) {
            return res.status(404).json({
                success: false,
                message: "Banner not found"
            });
        }

        const updateData = {};

        // Validate and add title
        if (title !== undefined) {
            if (!title.trim()) {
                return res.status(400).json({
                    success: false,
                    message: "Title cannot be empty",
                    errors: { title: "Title is required" }
                });
            }
            updateData.title = title.trim();
        }

        // Validate and add description
        if (description !== undefined) {
            updateData.description = description.trim();
        }

        // Process links
        if (link !== undefined) {
            let linkArray = [];
            if (link && typeof link === "string") {
                linkArray = link
                    .split(",")
                    .map(l => l.trim())
                    .filter(l => {
                        try {
                            new URL(l);
                            return true;
                        } catch {
                            return false;
                        }
                    });
            }
            updateData.link = linkArray;
        }

        // Validate and add email
        if (email !== undefined) {
            if (email && email.trim()) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(email)) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid email format",
                        errors: { email: "Please enter a valid email address" }
                    });
                }
                updateData.email = email.trim();
            } else {
                updateData.email = "";
            }
        }

        // Validate and add phone number
        if (phoneNumber !== undefined) {
            updateData.phoneNumber = phoneNumber?.trim() || "";
        }

        // Add status
        if (isActive !== undefined) {
            updateData.isActive = isActive === "true" || isActive === true;
        }

        // Handle image upload if new file provided
        if (req.file) {
            // Validate new image
            const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
            if (!validTypes.includes(req.file.mimetype)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid file type",
                    errors: { image: "Only JPEG, PNG, WEBP, and GIF images are allowed" }
                });
            }

            const maxSize = 5 * 1024 * 1024;
            if (req.file.size > maxSize) {
                return res.status(400).json({
                    success: false,
                    message: "File too large",
                    errors: { image: "Image must be less than 5MB" }
                });
            }

            // Upload new image
            let newImageUrl;
            try {
                newImageUrl = await uploadToCloudinary(req.file.buffer, "banners");
            } catch (uploadError) {
                return res.status(500).json({
                    success: false,
                    message: "Failed to upload new image",
                    error: uploadError.message
                });
            }

            // Delete old image from Cloudinary
            if (existingBanner.imageUrl) {
                try {
                    // await deleteFromCloudinary(existingBanner.imageUrl);
                } catch (deleteError) {
                    console.error("Failed to delete old image:", deleteError);
                    // Continue anyway, as the new image is uploaded
                }
            }

            updateData.imageUrl = newImageUrl;
        }

        // Update banner
        const updatedBanner = await Banner.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            message: "Banner updated successfully",
            data: updatedBanner
        });

    } catch (error) {
        console.error("Error updating banner:", error);

        if (error.name === "ValidationError") {
            const errors = Object.values(error.errors).reduce((acc, curr) => {
                acc[curr.path] = curr.message;
                return acc;
            }, {});

            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors
            });
        }

        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: "A banner with this title already exists",
                error: "Duplicate title"
            });
        }

        res.status(500).json({
            success: false,
            message: "Failed to update banner",
            error: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
};

/**
 * DELETE BANNER
 */
export const deleteBanner = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                message: "Invalid banner ID format"
            });
        }

        const banner = await Banner.findById(id);
        if (!banner) {
            return res.status(404).json({
                success: false,
                message: "Banner not found"
            });
        }

        // Delete image from Cloudinary
        if (banner.imageUrl) {
            try {
                // await deleteFromCloudinary(banner.imageUrl);
            } catch (deleteError) {
                console.error("Failed to delete image from storage:", deleteError);
                // Continue with banner deletion even if image deletion fails
            }
        }

        await Banner.findByIdAndDelete(id);

        res.status(200).json({
            success: true,
            message: "Banner deleted successfully"
        });

    } catch (error) {
        console.error("Error deleting banner:", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete banner",
            error: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
};

/**
 * TOGGLE BANNER STATUS
 */
export const toggleBannerStatus = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                message: "Invalid banner ID format"
            });
        }

        const banner = await Banner.findById(id);
        if (!banner) {
            return res.status(404).json({
                success: false,
                message: "Banner not found"
            });
        }

        banner.isActive = !banner.isActive;
        const updatedBanner = await banner.save();

        res.status(200).json({
            success: true,
            message: `Banner ${updatedBanner.isActive ? "activated" : "deactivated"} successfully`,
            data: updatedBanner
        });

    } catch (error) {
        console.error("Error toggling banner status:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update banner status",
            error: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
};