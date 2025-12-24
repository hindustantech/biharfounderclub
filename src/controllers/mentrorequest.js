import mentorreques from "../models/mentorreques.js";
import { sendMail } from "../services/emailService.js";
import User from "../models/User.js";
import Profile from "../models/Profile.js";
export const createMentorRequest = async (req, res) => {
    try {
        const { mentorId, message } = req.body;
        const userId = req.user._id;

        /* ===========================
           BASIC VALIDATION
        ============================ */
        if (!mentorId) {
            return res.status(400).json({
                success: false,
                message: "Mentor ID is required",
            });
        }

        if (mentorId.toString() === userId.toString()) {
            return res.status(400).json({
                success: false,
                message: "You cannot send a request to yourself",
            });
        }

        /* ===========================
           FETCH USER & MENTOR
        ============================ */
        const [user, mentor] = await Promise.all([
            Profile.findOne({ userId }).select("name email"),
            Profile.findOne({ userId: mentorId }).select("name email"),
        ]);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User profile not found",
            });
        }

        if (!mentor || !mentor.email) {
            return res.status(404).json({
                success: false,
                message: "Mentor not found or email missing",
            });
        }

        /* ===========================
           CHECK EXISTING REQUEST
        ============================ */
        const existingRequest = await mentorreques.findOne({
            user: userId,
            mentor: mentorId,
            status: "pending",
        });

        if (existingRequest) {
            return res.status(409).json({
                success: false,
                message: "You already have a pending request to this mentor",
            });
        }

        /* ===========================
           CREATE REQUEST
        ============================ */
        const newRequest = await mentorreques.create({
            user: userId,
            mentor: mentorId,
            message,
            status: "pending",
        });

        /* ===========================
           SEND EMAIL (AFTER DB SUCCESS)
        ============================ */
        await sendMail({
            to: mentor.email, // must be string
            subject: "New Mentor Request",
            html: `
        <h3>Hello ${mentor.name || "Mentor"},</h3>
        <p>You have received a new mentorship request.</p>
        <p><strong>From:</strong> ${user.name || "User"}</p>
        ${message ? `<p><strong>Message:</strong> ${message}</p>` : ""}
        <br/>
        <p>Please log in to your dashboard to respond.</p>
      `,
        });

        /* ===========================
           RESPONSE
        ============================ */
        return res.status(201).json({
            success: true,
            message: "Mentor request created successfully",
            request: newRequest,
        });

    } catch (error) {
        console.error("Create mentor request error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
