import Profile from "../models/Profile.js";
import mongoose from "mongoose";

/**
 * @desc    Get mentors with pagination, search, and filtering
 * @route   GET /api/mentors
 * @access  Public
 */
export const getMentors = async (req, res) => {
    try {
        // Parse query parameters with defaults
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || "";
        const expertise = req.query.expertise; // Single expertise or comma-separated
        const availableOnly = req.query.availableOnly === "true";
        const verifiedOnly = req.query.verifiedOnly === "true";

        // Calculate skip for pagination
        const skip = (page - 1) * limit;

        // Build base filter
        const filter = {
            membershipType: "Mentor",
            showInMentorSection: true,
            isActive: true
        };

        // Add search condition
        if (search) {
            const searchRegex = new RegExp(search, 'i');
            filter.$or = [
                { name: { $regex: searchRegex } },
                { areaOfExpertise: { $regex: searchRegex } },
                { occupationDescription: { $regex: searchRegex } },
                { previousExperience: { $regex: searchRegex } }
            ];
        }

        // Add expertise filter
        if (expertise) {
            const expertiseArray = expertise.split(',');
            filter.mentorshipFields = { $in: expertiseArray };
        }

        // Add availability filter
        if (availableOnly) {
            filter.availableForMentorship = true;
        }

        // Add verification filter
        if (verifiedOnly) {
            filter.profileVerified = true;
        }

        // Execute queries in parallel for better performance
        const [mentors, total, availableCount, verifiedCount] = await Promise.all([
            // Get paginated mentors
            Profile.find(filter)
                .select('name image occupation areaOfExpertise mentorshipFields previousExperience linkedinUrl  websiteUrl availableForMentorship profileVerified')
                .populate('userId', 'email')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),

            // Get total count
            Profile.countDocuments(filter),

            // Get count of available mentors
            Profile.countDocuments({ ...filter, availableForMentorship: true }),

            // Get count of verified mentors
            Profile.countDocuments({ ...filter, profileVerified: true })
        ]);

        // Calculate pagination metadata
        const totalPages = Math.ceil(total / limit);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;

        // Construct response
        const response = {
            success: true,
            message: "Mentors fetched successfully",
            data: {
                mentors,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages,
                    hasNextPage,
                    hasPrevPage,
                    nextPage: hasNextPage ? page + 1 : null,
                    prevPage: hasPrevPage ? page - 1 : null
                },
                filters: {
                    totalAvailable: availableCount,
                    totalVerified: verifiedCount,
                    appliedFilters: {
                        search,
                        expertise,
                        availableOnly,
                        verifiedOnly
                    }
                }
            }
        };

        // If no mentors found
        if (mentors.length === 0) {
            return res.status(200).json({
                ...response,
                message: "No mentors found matching your criteria",
                data: {
                    ...response.data,
                    mentors: []
                }
            });
        }

        res.status(200).json(response);

    } catch (error) {
        console.error("Error fetching mentors:", error);

        // Handle specific error types
        if (error instanceof mongoose.Error.CastError) {
            return res.status(400).json({
                success: false,
                message: "Invalid query parameters",
                error: error.message
            });
        }

        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: "Validation error",
                error: error.message
            });
        }

        // Generic server error
        res.status(500).json({
            success: false,
            message: "Server error while fetching mentors",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * @desc    Get mentor by ID
 * @route   GET /api/mentors/:id
 * @access  Public
 */
export const getMentorById = async (req, res) => {
    try {
        const { id } = req.params;

        // Validate ID format
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid mentor ID format"
            });
        }

        const mentor = await Profile.findOne({
            _id: id,
            membershipType: "Mentor",
            showInMentorSection: true,
            isActive: true
        })
            .select('-__v -createdAt -updatedAt -isActive')
            .populate('userId', 'email createdAt')
            .lean();

        if (!mentor) {
            return res.status(404).json({
                success: false,
                message: "Mentor not found or not visible"
            });
        }

        res.status(200).json({
            success: true,
            message: "Mentor details fetched successfully",
            data: mentor
        });

    } catch (error) {
        console.error("Error fetching mentor by ID:", error);

        res.status(500).json({
            success: false,
            message: "Server error while fetching mentor details",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * @desc    Get available expertise list for filtering
 * @route   GET /api/mentors/expertise
 * @access  Public
 */
export const getExpertiseList = async (req, res) => {
    try {
        // Aggregate to get unique expertise fields
        const expertiseList = await Profile.aggregate([
            {
                $match: {
                    membershipType: "Mentor",
                    showInMentorSection: true,
                    isActive: true,
                    mentorshipFields: { $exists: true, $ne: [] }
                }
            },
            { $unwind: "$mentorshipFields" },
            { $group: { _id: "$mentorshipFields", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $project: { expertise: "$_id", count: 1, _id: 0 } }
        ]);

        res.status(200).json({
            success: true,
            message: "Expertise list fetched successfully",
            data: expertiseList
        });

    } catch (error) {
        console.error("Error fetching expertise list:", error);

        res.status(500).json({
            success: false,
            message: "Server error while fetching expertise list",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * @desc    Get mentor statistics
 * @route   GET /api/mentors/stats
 * @access  Public/Admin
 */
export const getMentorStats = async (req, res) => {
    try {
        const stats = await Profile.aggregate([
            {
                $match: {
                    membershipType: "Mentor",
                    isActive: true
                }
            },
            {
                $group: {
                    _id: null,
                    totalMentors: { $sum: 1 },
                    visibleMentors: {
                        $sum: { $cond: [{ $eq: ["$showInMentorSection", true] }, 1, 0] }
                    },
                    availableMentors: {
                        $sum: { $cond: [{ $eq: ["$availableForMentorship", true] }, 1, 0] }
                    },
                    verifiedMentors: {
                        $sum: { $cond: [{ $eq: ["$profileVerified", true] }, 1, 0] }
                    },
                    byOccupation: {
                        $push: {
                            occupation: "$occupation",
                            visible: { $cond: [{ $eq: ["$showInMentorSection", true] }, 1, 0] }
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    totalMentors: 1,
                    visibleMentors: 1,
                    availableMentors: 1,
                    verifiedMentors: 1,
                    // Process occupation stats
                    occupationStats: {
                        $reduce: {
                            input: "$byOccupation",
                            initialValue: [],
                            in: {
                                $concatArrays: [
                                    "$$value",
                                    [
                                        {
                                            $cond: [
                                                { $in: ["$$this.occupation", "$$value.occupation"] },
                                                [],
                                                [{
                                                    occupation: "$$this.occupation",
                                                    count: {
                                                        $sum: {
                                                            $map: {
                                                                input: {
                                                                    $filter: {
                                                                        input: "$byOccupation",
                                                                        as: "item",
                                                                        cond: { $eq: ["$$item.occupation", "$$this.occupation"] }
                                                                    }
                                                                },
                                                                as: "occ",
                                                                in: "$$occ.visible"
                                                            }
                                                        }
                                                    }
                                                }]
                                            ]
                                        }
                                    ]
                                ]
                            }
                        }
                    }
                }
            }
        ]);

        res.status(200).json({
            success: true,
            message: "Mentor statistics fetched successfully",
            data: stats[0] || {
                totalMentors: 0,
                visibleMentors: 0,
                availableMentors: 0,
                verifiedMentors: 0,
                occupationStats: []
            }
        });

    } catch (error) {
        console.error("Error fetching mentor stats:", error);

        res.status(500).json({
            success: false,
            message: "Server error while fetching statistics",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};