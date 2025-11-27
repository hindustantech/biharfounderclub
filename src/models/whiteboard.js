import mongoose from "mongoose";

const whiteboardSchema = new mongoose.Schema(
    {
        category: {
            type: String,
            enum: ["startup_news", "services_wanted", "services_offering"],
            required: [true, "Category is required"],
            index: true,
        },

        title: {
            type: String,
            required: [true, "Title is required"],
            minlength: [3, "Title must be at least 3 characters"],
            maxlength: 150,
            trim: true,
        },

        description: {
            type: String,
            required: [true, "Description is required"],
            minlength: [10, "Description must be at least 10 characters"],
            maxlength: 5000,
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    { timestamps: true }
);

export default mongoose.model("Whiteboard", whiteboardSchema);
