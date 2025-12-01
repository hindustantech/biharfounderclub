import mongoose from "mongoose";
const bannerSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
    },
    imageUrl: {
        type: String,
        required: true,
    },
    link: {
        type: String,
        required: false,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
}, { timestamps: true });
export default mongoose.model("Banner", bannerSchema);