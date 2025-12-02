import mongoose from "mongoose";
import Profile from "../models/Profile.js";
import User from "../models/User.js";
import { Parser } from "json2csv";
import { validationResult } from "express-validator";

class ProfileController {
    // Get all profiles with search, filter, and pagination
    async getAllProfiles(req, res) {
        try {
            const {
                search,
                occupation,
                membershipType,
                profileVerified,
                showInMentorSection,
                status = "active", // NEW: active | inactive | all
                page = 1,
                limit = 10,
                sortBy = "createdAt",
                sortOrder = "desc"
            } = req.query;

            // Build filter object
            const filter = {};

            // Status filter
            if (status === "active") {
                filter.isActive = true;
            } else if (status === "inactive") {
                filter.isActive = false;
            }
            // status=all → no filter applied

            // Search filter
            if (search) {
                filter.$or = [
                    { name: { $regex: search, $options: "i" } },
                    { email: { $regex: search, $options: "i" } },
                    { phoneNumber: { $regex: search, $options: "i" } },
                    { pan: { $regex: search, $options: "i" } },
                    { occupationDescription: { $regex: search, $options: "i" } }
                ];
            }

            // Occupation filter
            if (occupation) filter.occupation = occupation;

            // Membership type filter
            if (membershipType) filter.membershipType = membershipType;

            // Profile verified filter
            if (profileVerified !== undefined) {
                filter.profileVerified = profileVerified === "true";
            }

            // Show in mentor section filter
            if (showInMentorSection !== undefined) {
                filter.showInMentorSection = showInMentorSection === "true";
            }

            // Pagination
            const skip = (parseInt(page) - 1) * parseInt(limit);

            // Sorting
            const sort = {};
            sort[sortBy] = sortOrder === "desc" ? -1 : 1;

            // Fetch profiles with user details
            const profiles = await Profile.find(filter)
                .populate({
                    path: "userId",
                    select: "fullName role whatsappNumber pan isVerified isActive",
                })
                .sort(sort)
                .skip(skip)
                .limit(parseInt(limit))
                .lean();

            const totalProfiles = await Profile.countDocuments(filter);

            res.status(200).json({
                success: true,
                data: profiles,  // NO filter userId null → admin wants full
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(totalProfiles / parseInt(limit)),
                    totalItems: totalProfiles,
                    itemsPerPage: parseInt(limit)
                }
            });

        } catch (error) {
            console.error("Error fetching profiles:", error);
            res.status(500).json({
                success: false,
                message: "Server error while fetching profiles",
                error: error.message
            });
        }
    }


    // Get profile by ID
    async getProfileById(req, res) {
        try {
            const { id } = req.params;

            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid profile ID format"
                });
            }

            const profile = await Profile.findOne({ _id: id, isActive: true })
                .populate({
                    path: "userId",
                    select: "fullName role whatsappNumber pan isVerified createdAt"
                });

            if (!profile) {
                return res.status(404).json({
                    success: false,
                    message: "Profile not found or has been deleted"
                });
            }

            res.status(200).json({
                success: true,
                data: profile
            });
        } catch (error) {
            console.error("Error fetching profile:", error);
            res.status(500).json({
                success: false,
                message: "Server error while fetching profile",
                error: error.message
            });
        }
    }

    // Update profile
    async updateProfile(req, res) {
        try {
            const { id } = req.params;
            const updateData = req.body;

            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid profile ID format"
                });
            }

            // Validate required fields for mentor
            if (updateData.membershipType === "Mentor") {
                if (updateData.showInMentorSection && (!updateData.mentorshipFields || updateData.mentorshipFields.length === 0)) {
                    return res.status(400).json({
                        success: false,
                        message: "Mentorship fields are required when showing in mentor section"
                    });
                }
            }

            // Find and update profile
            const profile = await Profile.findOneAndUpdate(
                { _id: id, isActive: true },
                updateData,
                { new: true, runValidators: true }
            ).populate("userId");

            if (!profile) {
                return res.status(404).json({
                    success: false,
                    message: "Profile not found or has been deleted"
                });
            }

            res.status(200).json({
                success: true,
                message: "Profile updated successfully",
                data: profile
            });
        } catch (error) {
            console.error("Error updating profile:", error);

            if (error.name === "ValidationError") {
                return res.status(400).json({
                    success: false,
                    message: "Validation error",
                    errors: Object.values(error.errors).map(err => err.message)
                });
            }

            res.status(500).json({
                success: false,
                message: "Server error while updating profile",
                error: error.message
            });
        }
    }

    // Delete profile (soft delete)
    async deleteProfile(req, res) {
        try {
            const { id } = req.params;

            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid profile ID format"
                });
            }

            const profile = await Profile.findOneAndUpdate(
                { _id: id, isActive: true },
                { isActive: false },
                { new: true }
            );

            if (!profile) {
                return res.status(404).json({
                    success: false,
                    message: "Profile not found or already deleted"
                });
            }

            // Optionally, you can also soft delete the associated user
            await User.findByIdAndUpdate(profile.userId, { isActive: false });

            res.status(200).json({
                success: true,
                message: "Profile deleted successfully",
                data: profile
            });
        } catch (error) {
            console.error("Error deleting profile:", error);
            res.status(500).json({
                success: false,
                message: "Server error while deleting profile",
                error: error.message
            });
        }
    }

    // Toggle show in mentor section
    async toggleMentorSection(req, res) {
        try {
            const { id } = req.params;
            const { showInMentorSection } = req.body;

            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid profile ID format"
                });
            }

            // Validate required fields for mentor
            if (showInMentorSection === true) {
                const profile = await Profile.findById(id);

                if (profile.membershipType !== "Mentor") {
                    return res.status(400).json({
                        success: false,
                        message: "Only mentors can be shown in mentor section"
                    });
                }

                if (!profile.mentorshipFields || profile.mentorshipFields.length === 0) {
                    return res.status(400).json({
                        success: false,
                        message: "Please add mentorship fields before showing in mentor section"
                    });
                }
            }

            const updatedProfile = await Profile.findOneAndUpdate(
                { _id: id, isActive: true },
                { showInMentorSection },
                { new: true, runValidators: true }
            ).populate("userId");

            if (!updatedProfile) {
                return res.status(404).json({
                    success: false,
                    message: "Profile not found or has been deleted"
                });
            }

            res.status(200).json({
                success: true,
                message: `Profile ${showInMentorSection ? 'added to' : 'removed from'} mentor section successfully`,
                data: updatedProfile
            });
        } catch (error) {
            console.error("Error toggling mentor section:", error);
            res.status(500).json({
                success: false,
                message: "Server error while updating mentor section",
                error: error.message
            });
        }
    }

    // Export profiles to Excel/CSV
    async exportProfilesToCSV(req, res) {
        try {
            const {
                occupation,
                membershipType,
                profileVerified,
                showInMentorSection
            } = req.query;

            // Build filter object
            const filter = { isActive: true };

            if (occupation) filter.occupation = occupation;
            if (membershipType) filter.membershipType = membershipType;
            if (profileVerified !== undefined) filter.profileVerified = profileVerified === "true";
            if (showInMentorSection !== undefined) filter.showInMentorSection = showInMentorSection === "true";

            // Fetch all matching profiles with user details
            const profiles = await Profile.find(filter)
                .populate({
                    path: "userId",
                    select: "fullName role whatsappNumber pan isVerified"
                })
                .lean();

            // Prepare data for CSV
            const csvData = profiles.map(profile => {
                const user = profile.userId || {};
                return {
                    "Profile ID": profile._id,
                    "User ID": profile.userId?._id || "N/A",
                    "Full Name": user.fullName || "N/A",
                    "Profile Name": profile.name,
                    "Email": profile.email,
                    "Phone Number": profile.phoneCountryCode + " " + profile.phoneNumber,
                    "WhatsApp Number": profile.whatsappNumber || user.whatsappNumber,
                    "PAN": profile.pan || user.pan,
                    "Occupation": profile.occupation,
                    "Occupation Description": profile.occupationDescription || "N/A",
                    "Membership Type": profile.membershipType,
                    "Mentorship Fields": profile.mentorshipFields ? profile.mentorshipFields.join(", ") : "N/A",
                    "Previous Experience": profile.previousExperience || "N/A",
                    "Area of Expertise": profile.areaOfExpertise || "N/A",
                    "Available for Mentorship": profile.availableForMentorship ? "Yes" : "No",
                    "Show in Mentor Section": profile.showInMentorSection ? "Yes" : "No",
                    "Profile Verified": profile.profileVerified ? "Yes" : "No",
                    "User Verified": user.isVerified ? "Yes" : "No",
                    "Date of Birth": profile.dob ? new Date(profile.dob).toLocaleDateString() : "N/A",
                    "Native Address": profile.nativeAddress || "N/A",
                    "Current Address": profile.currentAddress || "N/A",
                    "LinkedIn URL": profile.linkedinUrl || "N/A",
                    "Website URL": profile.websiteUrl || "N/A",
                    "Created At": new Date(profile.createdAt).toLocaleString(),
                    "Updated At": new Date(profile.updatedAt).toLocaleString()
                };
            });

            // Define CSV fields
            const fields = [
                "Profile ID",
                "User ID",
                "Full Name",
                "Profile Name",
                "Email",
                "Phone Number",
                "WhatsApp Number",
                "PAN",
                "Occupation",
                "Occupation Description",
                "Membership Type",
                "Mentorship Fields",
                "Previous Experience",
                "Area of Expertise",
                "Available for Mentorship",
                "Show in Mentor Section",
                "Profile Verified",
                "User Verified",
                "Date of Birth",
                "Native Address",
                "Current Address",
                "LinkedIn URL",
                "Website URL",
                "Created At",
                "Updated At"
            ];

            // Create CSV parser
            const json2csvParser = new Parser({ fields });
            const csv = json2csvParser.parse(csvData);

            // Set headers for file download
            res.header("Content-Type", "text/csv");
            res.attachment(`profiles_${Date.now()}.csv`);
            res.status(200).send(csv);
        } catch (error) {
            console.error("Error exporting profiles:", error);
            res.status(500).json({
                success: false,
                message: "Server error while exporting profiles",
                error: error.message
            });
        }
    }

    // Get all mentors (profiles with showInMentorSection = true)
    async getAllMentors(req, res) {
        try {
            const {
                search,
                areaOfExpertise,
                page = 1,
                limit = 10
            } = req.query;

            const filter = {
                isActive: true,
                membershipType: "Mentor",
                showInMentorSection: true,
                profileVerified: true // Only show verified profiles
            };

            // Search filter
            if (search) {
                filter.$or = [
                    { name: { $regex: search, $options: "i" } },
                    { areaOfExpertise: { $regex: search, $options: "i" } },
                    { occupationDescription: { $regex: search, $options: "i" } }
                ];
            }

            // Area of expertise filter
            if (areaOfExpertise) {
                filter.areaOfExpertise = { $regex: areaOfExpertise, $options: "i" };
            }

            const skip = (parseInt(page) - 1) * parseInt(limit);

            const mentors = await Profile.find(filter)
                .populate({
                    path: "userId",
                    select: "fullName role isVerified"
                })
                .select("name image areaOfExpertise occupationDescription mentorshipFields previousExperience availableForMentorship email phoneNumber linkedinUrl")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean();

            const totalMentors = await Profile.countDocuments(filter);

            res.status(200).json({
                success: true,
                data: mentors,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(totalMentors / parseInt(limit)),
                    totalItems: totalMentors,
                    itemsPerPage: parseInt(limit)
                }
            });
        } catch (error) {
            console.error("Error fetching mentors:", error);
            res.status(500).json({
                success: false,
                message: "Server error while fetching mentors",
                error: error.message
            });
        }
    }
}

export default new ProfileController();