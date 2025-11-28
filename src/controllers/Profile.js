import Profile from "../models/Profile.js";
import User from "../models/User.js";

export const getProfile = async (req, res, next) => {
    try {
        const profile = await Profile.findOne({ user: req.user.id });
        if (!profile) {
            return res.status(404).json({ message: "Profile not found" });
        }
        res.status(200).json(profile);
    } catch (error) {
        next(error);
    }
};

export const getuserdeatels = async (req, res, next) => {
    try {
        const userId = req.user.id
        const userDetails = await User.findById(userId).select("fullName whatsappNumber pan");
        if (!userDetails) {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json(

            userDetails
        );

        // Extract fields from body
    } catch (error) {
        next(error);
    }
};


/**
 * Validate required fields based on conditions
 */
const validateProfileFields = (data) => {
    const errors = [];

    // -------------------------------
    // OCCUPATION-BASED VALIDATION
    // -------------------------------
    if (data.occupation === "startup_promoter") {
        if (!data.occupationDescription) {
            errors.push("occupationDescription is required for startup_promoter.");
        }
        if (!data.supportStageMessage) {
            errors.push("supportStageMessage is required for startup_promoter.");
        } else {
            // Check WORD count (not character count)
            const words = data.supportStageMessage.trim().split(/\s+/).length;
            if (words < 50) {
                errors.push("supportStageMessage must be at least 50 words.");
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
        if (!data.previousExperience) {
            errors.push("previousExperience is required for Mentor.");
        }
        if (!data.areaOfExpertise) {
            errors.push("areaOfExpertise is required for Mentor.");
        }
        if (typeof data.availableForMentorship !== "boolean") {
            errors.push("availableForMentorship must be true or false.");
        }
    }

    return errors;
};



/**
 * @desc Create OR Update Profile (Auto Create if not found)
 * @route POST /api/profile
 * @access Private
 */
export const createOrUpdateProfile = async (req, res, next) => {
    try {
        // Extract fields from body
        const {
            name,
            image,
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
            availableForMentorship,
        } = req.body;

        // Prepare data object
        const profileData = {
            userId: req.user.id,
            name,
            image,
            dob,
            nativeAddress,
            currentAddress,
            phoneCountryCode: phoneCountryCode || "+91",
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
            availableForMentorship,
        };

        // -------------------------
        // CUSTOM VALIDATIONS
        // -------------------------
        const customErrors = validateProfileFields(profileData);
        if (customErrors.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: customErrors,
            });
        }

        // -------------------------
        // CHECK IF PROFILE EXISTS
        // -------------------------
        let profile = await Profile.findOne({ userId: req.user.id });

        if (!profile) {
            // ------------------------------------
            // CASE: PROFILE NOT FOUND → CREATE NEW
            // ------------------------------------
            const newProfile = new Profile(profileData);
            await newProfile.save();

            return res.status(201).json({
                success: true,
                message: "Profile created successfully",
                data: newProfile,
            });
        }

        // ------------------------------------
        // CASE: PROFILE EXISTS → UPDATE IT
        // ------------------------------------
        profile = await Profile.findOneAndUpdate(
            { userId: req.user.id },
            { $set: profileData },
            { new: true, runValidators: true }
        );

        return res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            data: profile,
        });

    } catch (error) {
        console.error("❌ Error in createOrUpdateProfile:", error);

        // Mongoose validation errors
        if (error.name === "ValidationError") {
            return res.status(400).json({
                success: false,
                message: "Schema validation failed",
                errors: Object.values(error.errors).map((e) => e.message),
            });
        }

        // Duplicate key error
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "Duplicate field value entered",
                duplicateField: Object.keys(error.keyValue),
            });
        }

        next(error);
    }
};




export const deleteProfile = async (req, res, next) => {
    try {
        const profile = await Profile.findOneAndDelete({ userId: req.user.id });
        if (!profile) {
            return res.status(404).json({ message: "Profile not found" });
        }
        res.status(200).json({ message: "Profile deleted successfully" });
    } catch (error) {
        next(error);
    }
};
