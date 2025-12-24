// models/mentorreques.js
import mongoose from "mongoose";

const mentorrequesSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        mentor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        message: {
            type: String,

        },
        status: {
            type: String,
            enum: ["pending", "accepted", "rejected"],
            default: "pending",
        },
        respondedAt: {
            type: Date,
            default: null,
        },

    },
    { timestamps: true }
);



export default mongoose.model("mentorreques", mentorrequesSchema);