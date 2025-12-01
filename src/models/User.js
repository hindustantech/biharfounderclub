import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
    {
        fullName: {
            type: String,
            required: [true, "Full name is required"],
            trim: true,
            minlength: 2,
            maxlength: 80,
        },



        whatsappNumber: {
            type: String,
            required: [true, "WhatsApp number is required"],
            trim: true,
        },

        pan: {
            type: String,
            required: [true, "PAN number is required"],
            uppercase: true,
            unique: true,
        },

        password: {
            type: String,
            minlength: 8,
        },

        refreshToken: {
            type: String,
            default: null,
        },

        uid: { type: String, default: null },
        otpExpires: { type: Date, default: null },
        showMentroshipSection: {
            type: Boolean,
            default: false,
        },


        isVerified: {
            type: Boolean,
            default: false,
        },

    },
    {
        timestamps: true,
    }
);

// Hash password before save
// Hash password before save
userSchema.pre("save", async function () {
    if (this.isModified("password")) {
        this.password = await bcrypt.hash(this.password, 10);
    }
});


// Compare password method
userSchema.methods.comparePassword = async function (password) {
    return await bcrypt.compare(password, this.password);
};

const User = mongoose.model("User", userSchema);
export default User;
