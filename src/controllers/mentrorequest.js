import mentorreques from "../models/mentorreques.js";

export const createMentorRequest = async (req, res) => {
    try {
        const { mentorId, message } = req.body;
        const userId = req.user._id;
        const existingRequest = await mentorreques.findOne({
            user: userId,
            mentor: mentorId,
            status: "pending",
        });
        if (existingRequest) {
            return res.status(400).json({
                error: "You already have a pending request to this mentor."
            });


        } const newRequest = new mentorreques({
            user: userId,
            mentor: mentorId,
            message,
        });
        await newRequest.save();
        res.status(201).json({ message: "Mentor request created successfully.", request: newRequest });
    }
    catch (error) {
        res.status(500).json({ error: "Server error." });
    }
};
