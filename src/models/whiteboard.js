// models/Whiteboard.js
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
        websiteurl: {
            type: String,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        image: {  // Change this to an object schema
            url: {
                type: String,
                trim: true
            },
            publicId: {
                type: String,
                trim: true
            },
            width: {
                type: Number
            },
            height: {
                type: Number
            },
            bytes: {
                type: Number
            },
            format: {
                type: String,
                trim: true
            }
        },
        // Admin specific fields
        status: {
            type: String,
            enum: ["pending", "active", "rejected", "archived"],
            default: "pending",
            index: true,
        },

        isFeatured: {
            type: Boolean,
            default: false,
        },

        featuredUntil: {
            type: Date,
            default: null,
        },

        adminNotes: {
            type: String,
            maxlength: 1000,
        },

        // Metadata
        views: {
            type: Number,
            default: 0,
        },

        lastModifiedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        }
    },
    { timestamps: true }
);

// Index for better query performance
whiteboardSchema.index({ status: 1, category: 1 });
whiteboardSchema.index({ isFeatured: 1, status: 1 });

export default mongoose.model("Whiteboard", whiteboardSchema);