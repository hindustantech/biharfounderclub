import mongoose from "mongoose";

const bannerSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
            unique: true,
            index: true,
        },
        imageUrl: {
            type: String,
            required: true,
            validate: {
                validator: function(v) {
                    return /^https?:\/\/.+\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i.test(v);
                },
                message: props => `${props.value} is not a valid image URL!`
            }
        },
        imagePublicId: {
            type: String,
            required: true,
        },
        imageMetadata: {
            format: String,
            width: Number,
            height: Number,
            size: Number, // in bytes
            uploadedAt: {
                type: Date,
                default: Date.now
            }
        },
        link: {
            type: [String],
            default: [],
            validate: {
                validator: function(links) {
                    return links.every(link => {
                        try {
                            new URL(link);
                            return true;
                        } catch {
                            return false;
                        }
                    });
                },
                message: props => `${props.value} contains invalid URLs!`
            }
        },
        email: {
            type: String,
            trim: true,
            lowercase: true,
            validate: {
                validator: function(v) {
                    return !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
                },
                message: props => `${props.value} is not a valid email address!`
            }
        },
        phoneNumber: {
            type: String,
            trim: true,
            validate: {
                validator: function(v) {
                    return !v || /^[\+]?[1-9][\d]{0,15}$/.test(v);
                },
                message: props => `${props.value} is not a valid phone number!`
            }
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
        views: {
            type: Number,
            default: 0,
        },
        clicks: {
            type: Number,
            default: 0,
        },
        tags: [{
            type: String,
            trim: true,
            lowercase: true
        }],
        priority: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        }
    },
    { 
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);

// Virtual for image size in MB
bannerSchema.virtual('imageSizeMB').get(function() {
    return this.imageMetadata?.size ? (this.imageMetadata.size / (1024 * 1024)).toFixed(2) : 0;
});

// Indexes for better query performance
bannerSchema.index({ isActive: 1, priority: -1 });
bannerSchema.index({ tags: 1 });
bannerSchema.index({ createdAt: -1 });

export default mongoose.model("Banner", bannerSchema);