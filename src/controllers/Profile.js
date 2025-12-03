import Profile from "../models/Profile.js";
import User from "../models/User.js";
import {
    uploadToCloudinary,
    deleteFromCloudinary,
    processImage,
    validateImage,
    generateUniqueFilename
} from "../config/imageUpload.js";
import { validationResult } from "express-validator";

/**
 * Validate required fields based on conditions
 */
const validateProfileFields = (data) => {
    const errors = [];

    // Name validation
    if (!data.name || !data.name.trim()) {
        errors.push("Name is required");
    } else if (data.name.length < 2 || data.name.length > 100) {
        errors.push("Name must be between 2 and 100 characters");
    }

    // Email validation
    if (data.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.email)) {
            errors.push("Invalid email format");
        }
    }

    // Phone number validation
    if (data.phoneNumber) {
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        if (!phoneRegex.test(data.phoneNumber)) {
            errors.push("Invalid phone number format");
        }
    }

    // PAN validation
    if (data.pan) {
        const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
        if (!panRegex.test(data.pan)) {
            errors.push("Invalid PAN number format (e.g., ABCDE1234F)");
        }
    }

    // URL validations
    if (data.linkedinUrl && !isValidUrl(data.linkedinUrl)) {
        errors.push("Invalid LinkedIn URL");
    }

    if (data.websiteUrl && !isValidUrl(data.websiteUrl)) {
        errors.push("Invalid website URL");
    }

    // Date of birth validation
    if (data.dob) {
        const dob = new Date(data.dob);
        const today = new Date();
        const minDate = new Date('1900-01-01');

        if (dob > today) {
            errors.push("Date of birth cannot be in the future");
        }
        if (dob < minDate) {
            errors.push("Date of birth cannot be before 1900");
        }

        // Calculate age
        const age = today.getFullYear() - dob.getFullYear();
        if (age < 18) {
            errors.push("Must be at least 18 years old");
        }
    }

    // -------------------------------
    // OCCUPATION-BASED VALIDATION
    // -------------------------------
    if (data.occupation === "startup_promoter") {
        if (!data.occupationDescription || !data.occupationDescription.trim()) {
            errors.push("occupationDescription is required for startup_promoter.");
        }
        if (!data.supportStageMessage || !data.supportStageMessage.trim()) {
            errors.push("supportStageMessage is required for startup_promoter.");
        } else {
            // Check WORD count (not character count)
            const words = data.supportStageMessage.trim().split(/\s+/).length;
            if (words < 50) {
                errors.push("supportStageMessage must be at least 50 words.");
            }
            if (words > 1000) {
                errors.push("supportStageMessage must be less than 1000 words.");
            }
        }
    }

    // -------------------------------
    // MEMBERSHIP TYPE VALIDATION
    // -------------------------------
    if (data.membershipType === "Mentor") {
        if (!data.mentorshipFields || data.mentorshipFields.length === 0) {
            errors.push("mentorshipFields (1–5 keywords) are required for Mentor.");
        }
        if (data.mentorshipFields?.length > 5) {
            errors.push("Maximum 5 keywords allowed in mentorshipFields.");
        }
        if (!data.previousExperience || !data.previousExperience.trim()) {
            errors.push("previousExperience is required for Mentor.");
        }
        if (!data.areaOfExpertise || !data.areaOfExpertise.trim()) {
            errors.push("areaOfExpertise is required for Mentor.");
        }
        if (typeof data.availableForMentorship !== "boolean") {
            errors.push("availableForMentorship must be true or false.");
        }
    }

    return errors;
};

/**
 * Validate URL format
 */
const isValidUrl = (url) => {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
};

/**
 * Validate image file
 */
const validateProfileImage = async (buffer) => {
    try {
        // Validate image dimensions and size
        const metadata = await validateImage(buffer, {
            minWidth: 100,
            minHeight: 100,
            maxWidth: 2000,
            maxHeight: 2000,
            maxFileSize: 10 * 1024 * 1024, // 10MB for profile images
            aspectRatio: null
        });

        return {
            isValid: true,
            metadata,
            message: "Image validation successful"
        };
    } catch (error) {
        return {
            isValid: false,
            message: error.message
        };
    }
};

/**
 * @desc Get user profile
 * @route GET /api/profile
 * @access Private
 */
export const getProfile = async (req, res) => {
    try {
        const profile = await Profile.findOne({ userId: req.user.id })
            .select("-__v")
            .lean();

        if (!profile) {
            return res.status(404).json({
                success: false,
                message: "Profile not found",
                data: null
            });
        }

        res.status(200).json({
            success: true,
            message: "Profile retrieved successfully",
            data: profile
        });
    } catch (error) {
        console.error("❌ Error in getProfile:", error);
        res.status(500).json({
            success: false,
            message: "Server error while fetching profile",
            error: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
};

/**
 * @desc Get user details from User model
 * @route GET /api/profile/user-details
 * @access Private
 */
export const getUserDetails = async (req, res) => {
    try {
        const userId = req.user.id;
        const userDetails = await User.findById(userId)
            .select("fullName whatsappNumber pan email phoneNumber createdAt")
            .lean();

        if (!userDetails) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "User details retrieved successfully",
            data: userDetails
        });
    } catch (error) {
        console.error("❌ Error in getUserDetails:", error);
        res.status(500).json({
            success: false,
            message: "Server error while fetching user details",
            error: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
};

/**
 * @desc Create OR Update Profile (Auto Create if not found)
 * @route POST /api/profile
 * @access Private
 */
// In your createOrUpdateProfile function, update the image handling section:

/**
 * @desc Create OR Update Profile (Auto Create if not found)
 * @route POST /api/profile
 * @access Private
 */
export const createOrUpdateProfile = async (req, res) => {
    let cloudinaryPublicId = null;

    try {
        // Express-validator results
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: errors.array().map(err => ({
                    field: err.param,
                    message: err.msg
                }))
            });
        }

        const {
            name,
            dob,
            nativeAddress,
            currentAddress,
            phoneCountryCode,
            phoneNumber,
            whatsappNumber,
            email,
            pan,
            linkedinUrl,
            websiteUrl,
            occupation,
            occupationDescription,
            supportStageMessage,
            membershipType,
            mentorshipFields,
            previousExperience,
            areaOfExpertise,
            availableForMentorship = false,
        } = req.body;

        // -------------------------
        // VALIDATE INPUT FIELDS
        // -------------------------
        const fieldValidationErrors = validateProfileFields({
            name,
            dob,
            email,
            phoneNumber,
            pan,
            linkedinUrl,
            websiteUrl,
            occupation,
            occupationDescription,
            supportStageMessage,
            membershipType,
            mentorshipFields: mentorshipFields ?
                (typeof mentorshipFields === 'string' ?
                    mentorshipFields.split(',').map(f => f.trim()) :
                    mentorshipFields
                ) : [],
            previousExperience,
            areaOfExpertise,
            availableForMentorship
        });

        if (fieldValidationErrors.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Field validation failed",
                errors: fieldValidationErrors
            });
        }

        let imageUrl = null;
        let imagePublicId = null;
        let imageMetadata = null;

        // -------------------------
        // IMAGE HANDLING
        // -------------------------
        if (req.file) {
            try {
                // Validate image
                const imageValidation = await validateProfileImage(req.file.buffer);
                if (!imageValidation.isValid) {
                    return res.status(400).json({
                        success: false,
                        message: "Image validation failed",
                        errors: { image: imageValidation.message }
                    });
                }

                // Process image (resize, compress, convert to WebP)
                const processedBuffer = await processImage(req.file.buffer);

                // Generate unique filename
                const filename = generateUniqueFilename(
                    req.file.originalname || 'profile',
                    processedBuffer
                );

                // Upload to Cloudinary
                const folder = `profiles/${new Date().getFullYear()}/${new Date().getMonth() + 1}`;
                const uploadResult = await uploadToCloudinary(processedBuffer, folder, {
                    public_id: filename.replace(/\.[^/.]+$/, ""),
                    transformation: [
                        { width: 500, height: 500, crop: 'fill' },
                        { quality: 'auto:best' },
                        { fetch_format: 'auto' }
                    ]
                });

                // CRITICAL FIX: Extract just the URL string, not the entire object
                imageUrl = uploadResult.url; // This should be just the URL string
                imagePublicId = uploadResult.publicId; // This is separate field
                imageMetadata = {
                    format: uploadResult.format,
                    width: uploadResult.width,
                    height: uploadResult.height,
                    size: uploadResult.bytes,
                    uploadedAt: new Date().toISOString()
                };

                cloudinaryPublicId = imagePublicId;

            } catch (uploadError) {
                console.error("❌ Cloudinary upload error:", uploadError);
                return res.status(500).json({
                    success: false,
                    message: "Failed to upload profile image",
                    error: uploadError.message
                });
            }
        }

        // Prepare profile data - MAKE SURE IMAGE IS JUST A STRING
        const profileData = {
            userId: req.user.id,
            name: name?.trim(),
            // CRITICAL: Save only the URL string in the 'image' field
            image: imageUrl, // This must be a string, not an object
            imagePublicId: imagePublicId, // Store Cloudinary public ID separately
            imageMetadata: imageMetadata, // Store metadata separately
            dob: dob ? new Date(dob) : undefined,
            nativeAddress: nativeAddress?.trim(),
            currentAddress: currentAddress?.trim(),
            phoneCountryCode: phoneCountryCode?.trim() || "+91",
            phoneNumber: phoneNumber?.trim(),
            whatsappNumber: whatsappNumber?.trim(),
            email: email?.trim().toLowerCase(),
            pan: pan?.trim().toUpperCase(),
            linkedinUrl: linkedinUrl?.trim(),
            websiteUrl: websiteUrl?.trim(),
            occupation: occupation?.trim(),
            occupationDescription: occupationDescription?.trim(),
            supportStageMessage: supportStageMessage?.trim(),
            membershipType: membershipType?.trim(),
            mentorshipFields: mentorshipFields ?
                (typeof mentorshipFields === 'string' ?
                    mentorshipFields.split(',').map(f => f.trim().toLowerCase()) :
                    mentorshipFields.map(f => f.trim().toLowerCase())
                ) : [],
            previousExperience: previousExperience?.trim(),
            areaOfExpertise: areaOfExpertise?.trim(),
            availableForMentorship: availableForMentorship === true || availableForMentorship === 'true',
            lastUpdated: new Date()
        };

        // Debug log to check data structure
        console.log("Profile data to save:", {
            image: typeof profileData.image,
            imagePublicId: typeof profileData.imagePublicId,
            imageMetadata: typeof profileData.imageMetadata
        });

        // Remove undefined values for clean update
        Object.keys(profileData).forEach(
            (key) => profileData[key] === undefined && delete profileData[key]
        );

        // Check existing profile
        let existingProfile = await Profile.findOne({ userId: req.user.id });

        // Delete old image from Cloudinary if new image is uploaded
        if (existingProfile && existingProfile.imagePublicId && imagePublicId) {
            try {
                await deleteFromCloudinary(existingProfile.imagePublicId);
            } catch (deleteError) {
                console.warn("⚠️ Could not delete old profile image:", deleteError.message);
                // Continue anyway - new image is already uploaded
            }
        }

        if (!existingProfile) {
            // Create new profile
            const newProfile = new Profile(profileData);
            await newProfile.save();

            return res.status(201).json({
                success: true,
                message: "Profile created successfully",
                data: {
                    ...newProfile.toObject(),
                    // Make sure we're returning string URL to frontend
                    image: newProfile.image // Should be string URL
                }
            });
        }

        // Update existing profile
        const updatedProfile = await Profile.findOneAndUpdate(
            { userId: req.user.id },
            { $set: profileData },
            {
                new: true,
                runValidators: true,
                context: 'query'
            }
        ).select("-__v");

        // Verify the image field is a string
        if (updatedProfile && typeof updatedProfile.image !== 'string' && updatedProfile.image !== null) {
            console.error("❌ Image field is not a string:", updatedProfile.image);
            // Convert to string if it's an object
            if (typeof updatedProfile.image === 'object' && updatedProfile.image.url) {
                await Profile.updateOne(
                    { _id: updatedProfile._id },
                    { $set: { image: updatedProfile.image.url } }
                );
                updatedProfile.image = updatedProfile.image.url;
            }
        }

        return res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            data: updatedProfile
        });

    } catch (error) {
        console.error("❌ Error in createOrUpdateProfile:", error);

        // Clean up uploaded image if error occurred
        if (cloudinaryPublicId) {
            try {
                await deleteFromCloudinary(cloudinaryPublicId);
            } catch (cleanupError) {
                console.error("❌ Failed to cleanup uploaded image:", cleanupError);
            }
        }

        // Handle CastError specifically for image field
        if (error.name === "CastError" && error.path === "image") {
            return res.status(400).json({
                success: false,
                message: "Invalid image data format",
                error: "Image must be a URL string"
            });
        }

        // Handle duplicate key errors
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "Duplicate field value entered",
                duplicateField: Object.keys(error.keyValue),
                error: "A profile with this information already exists"
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
                message: "Schema validation failed",
                errors
            });
        }

        // Handle CastError (invalid ObjectId, Date, etc.)
        if (error.name === "CastError") {
            return res.status(400).json({
                success: false,
                message: `Invalid ${error.path}: ${error.value}`,
                error: "Invalid data format"
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
 * @desc Delete profile image only
 * @route DELETE /api/profile/image
 * @access Private
 */
export const deleteProfileImage = async (req, res) => {
    try {
        const profile = await Profile.findOne({ userId: req.user.id });

        if (!profile) {
            return res.status(404).json({
                success: false,
                message: "Profile not found"
            });
        }

        if (!profile.imagePublicId) {
            return res.status(400).json({
                success: false,
                message: "No profile image to delete"
            });
        }

        // Delete from Cloudinary
        const deleted = await deleteFromCloudinary(profile.imagePublicId);

        if (!deleted) {
            return res.status(500).json({
                success: false,
                message: "Failed to delete image from storage"
            });
        }

        // Update profile to remove image references
        profile.image = null;
        profile.imagePublicId = null;
        profile.imageMetadata = null;
        await profile.save();

        res.status(200).json({
            success: true,
            message: "Profile image deleted successfully",
            data: {
                userId: profile.userId,
                name: profile.name
            }
        });

    } catch (error) {
        console.error("❌ Error in deleteProfileImage:", error);
        res.status(500).json({
            success: false,
            message: "Server error while deleting profile image",
            error: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
};

/**
 * @desc Delete entire profile
 * @route DELETE /api/profile
 * @access Private
 */
export const deleteProfile = async (req, res) => {
    try {
        const profile = await Profile.findOne({ userId: req.user.id });

        if (!profile) {
            return res.status(404).json({
                success: false,
                message: "Profile not found"
            });
        }

        // Delete profile image from Cloudinary if exists
        if (profile.imagePublicId) {
            try {
                await deleteFromCloudinary(profile.imagePublicId);
            } catch (deleteError) {
                console.warn("⚠️ Could not delete profile image:", deleteError.message);
                // Continue with profile deletion
            }
        }

        // Delete the profile
        await Profile.findOneAndDelete({ userId: req.user.id });

        res.status(200).json({
            success: true,
            message: "Profile deleted successfully",
            data: {
                userId: profile.userId,
                name: profile.name,
                deletedAt: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error("❌ Error in deleteProfile:", error);
        res.status(500).json({
            success: false,
            message: "Server error while deleting profile",
            error: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
};

/**
 * @desc Update profile image only
 * @route PATCH /api/profile/image
 * @access Private
 */
export const updateProfileImage = async (req, res) => {
    let cloudinaryPublicId = null;

    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "No image file provided"
            });
        }

        const profile = await Profile.findOne({ userId: req.user.id });

        if (!profile) {
            return res.status(404).json({
                success: false,
                message: "Profile not found. Please create a profile first."
            });
        }

        // Validate image
        const imageValidation = await validateProfileImage(req.file.buffer);
        if (!imageValidation.isValid) {
            return res.status(400).json({
                success: false,
                message: "Image validation failed",
                errors: { image: imageValidation.message }
            });
        }

        // Process image
        const processedBuffer = await processImage(req.file.buffer);

        // Generate unique filename
        const filename = generateUniqueFilename(
            req.file.originalname || 'profile',
            processedBuffer
        );

        // Upload to Cloudinary
        const folder = `profiles/${new Date().getFullYear()}/${new Date().getMonth() + 1}`;
        const uploadResult = await uploadToCloudinary(processedBuffer, folder, {
            public_id: filename.replace(/\.[^/.]+$/, ""),
            transformation: [
                { width: 500, height: 500, crop: 'fill' },
                { quality: 'auto:best' },
                { fetch_format: 'auto' }
            ]
        });

        cloudinaryPublicId = uploadResult.publicId;

        // Delete old image if exists
        if (profile.imagePublicId) {
            try {
                await deleteFromCloudinary(profile.imagePublicId);
            } catch (deleteError) {
                console.warn("⚠️ Could not delete old profile image:", deleteError.message);
            }
        }

        // Update profile with new image
        profile.image = uploadResult.url;
        profile.imagePublicId = uploadResult.publicId;
        profile.imageMetadata = {
            format: uploadResult.format,
            width: uploadResult.width,
            height: uploadResult.height,
            size: uploadResult.bytes,
            uploadedAt: new Date().toISOString()
        };
        profile.lastUpdated = new Date();

        await profile.save();

        res.status(200).json({
            success: true,
            message: "Profile image updated successfully",
            data: {
                image: profile.image,
                imageMetadata: profile.imageMetadata
            },
            imageInfo: {
                size: uploadResult.bytes,
                dimensions: `${uploadResult.width}x${uploadResult.height}`,
                format: uploadResult.format
            }
        });

    } catch (error) {
        console.error("❌ Error in updateProfileImage:", error);

        // Clean up uploaded image if error occurred
        if (cloudinaryPublicId) {
            try {
                await deleteFromCloudinary(cloudinaryPublicId);
            } catch (cleanupError) {
                console.error("❌ Failed to cleanup uploaded image:", cleanupError);
            }
        }

        res.status(500).json({
            success: false,
            message: "Server error while updating profile image",
            error: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
};