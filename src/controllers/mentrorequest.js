import mentorreques from "../models/mentorreques.js";
import { sendMail } from "../services/emailService.js";
import User from "../models/User.js";
import Profile from "../models/Profile.js";

export const createMentorRequest = async (req, res) => {
    console.log("📝 createMentorRequest called");
    console.log("📦 Request body:", JSON.stringify(req.body, null, 2));

    try {
        const { mentorId, message } = req.body;
        const userId = req.user?._id;

        // Check authentication
        if (!userId) {
            console.error("❌ No user ID in request");
            return res.status(401).json({
                success: false,
                message: "Authentication required. Please log in.",
            });
        }

        if (!mentorId) {
            console.error("❌ Missing mentorId");
            return res.status(400).json({
                success: false,
                message: "Mentor ID is required",
            });
        }

        console.log("🔍 User ID:", userId);
        console.log("🔍 Mentor ID:", mentorId);

        /* ===========================
           FETCH PROFILES
        ============================ */
        const [userProfile, mentorProfile] = await Promise.all([
            Profile.findOne({ userId }).select("name email"),
            Profile.findById(mentorId).select("name email availableForMentorship")
        ]);

        console.log("👤 User Profile found:", !!userProfile);
        console.log("👨‍🏫 Mentor Profile found:", !!mentorProfile);

        if (!userProfile) {
            console.error("❌ User profile not found for userId:", userId);
            return res.status(404).json({
                success: false,
                message: "Your profile not found. Please complete your profile first.",
            });
        }

        if (!mentorProfile) {
            console.error("❌ Mentor profile not found for mentorId:", mentorId);
            return res.status(404).json({
                success: false,
                message: "Mentor not found",
            });
        }

        // Check if mentor is available for mentorship
        if (!mentorProfile.availableForMentorship) {
            console.error("❌ Mentor not available for mentorship");
            return res.status(400).json({
                success: false,
                message: "This mentor is not currently available for mentorship",
            });
        }

        // Check if mentor has email
        if (!mentorProfile.email) {
            console.error("❌ No email found for mentor:", mentorProfile.name);
            return res.status(400).json({
                success: false,
                message: "Mentor email is not available",
            });
        }

        console.log("📧 Mentor email:", mentorProfile.email);
        console.log("👤 User name:", userProfile.name);
        console.log("👨‍🏫 Mentor name:", mentorProfile.name);

        /* ===========================
           CHECK EXISTING REQUEST
        ============================ */
        const existingRequest = await mentorreques.findOne({
            user: userId,
            mentor: mentorId,
            status: "pending",
        });

        if (existingRequest) {
            console.error("❌ Duplicate request found");
            return res.status(409).json({
                success: false,
                message: "You already have a pending request to this mentor",
            });
        }

        console.log("✅ No duplicate requests found");

        /* ===========================
           CREATE REQUEST
        ============================ */
        const newRequest = await mentorreques.create({
            user: userId,
            mentor: mentorId,
            message: message || "",
            status: "pending",
        });

        console.log("✅ Request created in DB:", newRequest._id);

        /* ===========================
           SEND EMAIL
        ============================ */
        console.log("📧 Preparing to send email to:", mentorProfile.email);

        const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #2563eb; margin: 0;">Bihari Founders Club</h1>
                    <p style="color: #6b7280; margin: 5px 0;">Mentorship Program</p>
                </div>
                
                <h2 style="color: #111827;">New Mentor Request</h2>
                
                <p>Hello <strong style="color: #2563eb;">${mentorProfile.name}</strong>,</p>
                
                <p>You have received a new mentorship request from a member of Bihari Founders Club.</p>
                
                <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #2563eb; margin: 25px 0;">
                    <h3 style="color: #374151; margin-top: 0;">Request Details:</h3>
                    <p><strong>Requestor:</strong> ${userProfile.name}</p>
                    <p><strong>Request Date:</strong> ${new Date().toLocaleDateString('en-IN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })}</p>
                    <p><strong>Time:</strong> ${new Date().toLocaleTimeString('en-IN')}</p>
                    ${message ? `<p><strong>Message:</strong> "${message}"</p>` : ''}
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="https://www.biharifoundersclub.com/dashboard/mentorship-requests" 
                       style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                       View Request in Dashboard
                    </a>
                </div>
                
                <p>Please log in to your BFC dashboard to accept or decline this request.</p>
                
                <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280;">
                    <p><strong>Note:</strong> This is an automated notification from Bihari Founders Club.</p>
                    <p>If you believe you received this email in error, please ignore it.</p>
                    <p>© ${new Date().getFullYear()} Bihari Founders Club. All rights reserved.</p>
                </div>
            </div>
        `;

        const emailText = `
NEW MENTOR REQUEST - Bihari Founders Club
=========================================

Hello ${mentorProfile.name},

You have received a new mentorship request from ${userProfile.name}.

Request Details:
----------------
• Requestor: ${userProfile.name}
• Date: ${new Date().toLocaleDateString()}
• Time: ${new Date().toLocaleTimeString()}
${message ? `• Message: ${message}` : ''}

To respond to this request, please log in to your BFC dashboard:
https://www.biharifoundersclub.com/dashboard/mentorship-requests

Thank you,
Bihari Founders Club Team
        `;

        try {
            console.log("📤 Calling sendMail function...");
            const emailResult = await sendMail({
                to: mentorProfile.email,
                subject: `New Mentor Request: ${userProfile.name} wants your guidance`,
                text: emailText,
                html: emailHtml
            });

            console.log("✅ Email sent successfully!");
            console.log("📫 Message ID:", emailResult.messageId);

        } catch (emailError) {
            console.error("❌ Email sending failed with error:");
            console.error("Error message:", emailError.message);
            console.error("Error stack:", emailError.stack);

            // Continue even if email fails - don't rollback the request
            console.log("⚠️  Request was created but email failed. Continuing...");
        }

        /* ===========================
           SUCCESS RESPONSE
        ============================ */
        return res.status(201).json({
            success: true,
            message: "Mentor request created successfully",
            requestId: newRequest._id,
            data: {
                requestId: newRequest._id,
                mentorName: mentorProfile.name,
                userName: userProfile.name,
                status: "pending",
                createdAt: newRequest.createdAt
            }
        });

    } catch (error) {
        console.error("❌ Fatal error in createMentorRequest:");
        console.error("Error name:", error.name);
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);

        // Check for specific errors
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: "Validation error",
                error: error.message
            });
        }

        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: "Invalid ID format"
            });
        }

        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};
