// controllers/dashboardController.js
import User from "../models/User.js";
import Banner from "../models/banner.js";
import Profile from "../models/Profile.js";
import Whiteboard from "../models/whiteboard.js";

export const getDashboardStats = async (req, res) => {
    try {
        // Get total active banners
        const totalActiveBanners = await Banner.countDocuments({ isActive: true });

        // Get total active mentors (users with membershipType = "Mentor" and isActive = true in Profile)
        const totalActiveMentors = await Profile.countDocuments({
            membershipType: "Mentor",
            isActive: true,
            profileVerified: true // optional: only include verified mentors
        });

        // Get total active whiteboards (status = "active")
        const totalActiveWhiteboards = await Whiteboard.countDocuments({
            status: "active"
        });

        // Get latest 5 users with their profile details
        const latestUsers = await User.aggregate([
            {
                $match: {
                    isVerified: true, // optional: only verified users
                    role: "user" // only regular users, not admins
                }
            },
            {
                $sort: { createdAt: -1 } // Latest first
            },
            {
                $limit: 5 // Only 5 users
            },
            {
                $lookup: {
                    from: "profiles", // Collection name in MongoDB (usually lowercase plural)
                    localField: "_id",
                    foreignField: "userId",
                    as: "profile"
                }
            },
            {
                $unwind: {
                    path: "$profile",
                    preserveNullAndEmptyArrays: true // Include users even if they don't have profile
                }
            },
            {
                $project: {
                    _id: 1,
                    fullName: 1,
                    whatsappNumber: 1,
                    pan: 1,
                    role: 1,
                    isVerified: 1,
                    createdAt: 1,
                    "profile.name": 1,
                    "profile.email": 1,
                    "profile.phoneNumber": 1,
                    "profile.membershipType": 1,
                    "profile.occupation": 1,
                    "profile.isActive": 1
                }
            }
        ]);

        // Alternative: If you want to use populate instead of aggregate
        /*
        const latestUsers = await User.find({ role: "user", isVerified: true })
          .sort({ createdAt: -1 })
          .limit(5)
          .populate({
            path: "profile",
            model: "Profile",
            select: "name email phoneNumber membershipType occupation isActive"
          })
          .select("fullName whatsappNumber pan role isVerified createdAt");
        */

        // Send response
        res.status(200).json({
            success: true,
            message: "Dashboard statistics fetched successfully",
            data: {
                counts: {
                    totalActiveBanners,
                    totalActiveMentors,
                    totalActiveWhiteboards
                },
                latestUsers,
                timestamp: new Date()
            }
        });

    } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch dashboard statistics",
            error: error.message
        });
    }
};

// Alternative version with separate queries if aggregation is too complex
export const getDashboardStatsSimple = async (req, res) => {
    try {
        // Run all count queries in parallel for better performance
        const [
            totalActiveBanners,
            totalActiveMentors,
            totalActiveWhiteboards
        ] = await Promise.all([
            Banner.countDocuments({ isActive: true }),
            Profile.countDocuments({
                membershipType: "Mentor",
                isActive: true
            }),
            Whiteboard.countDocuments({ status: "active" })
        ]);

        // Get latest 5 users with populate
        const latestUsers = await User.find({
            role: "user",
            isVerified: true
        })
            .sort({ createdAt: -1 })
            .limit(5)
            .populate({
                path: "profile",
                select: "name email phoneNumber membershipType occupation isActive createdAt"
            })
            .select("fullName whatsappNumber pan role isVerified createdAt")
            .lean(); // Convert to plain JavaScript objects

        // Format user data
        const formattedUsers = latestUsers.map(user => ({
            _id: user._id,
            fullName: user.fullName,
            whatsappNumber: user.whatsappNumber,
            pan: user.pan,
            role: user.role,
            isVerified: user.isVerified,
            joinedAt: user.createdAt,
            profile: user.profile ? {
                name: user.profile.name,
                email: user.profile.email,
                phoneNumber: user.profile.phoneNumber,
                membershipType: user.profile.membershipType,
                occupation: user.profile.occupation,
                isActive: user.profile.isActive
            } : null
        }));

        res.status(200).json({
            success: true,
            message: "Dashboard statistics fetched successfully",
            data: {
                counts: {
                    totalActiveBanners,
                    totalActiveMentors,
                    totalActiveWhiteboards
                },
                latestUsers: formattedUsers,
                totalLatestUsers: formattedUsers.length
            }
        });

    } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch dashboard statistics",
            error: error.message
        });
    }
};