import mongoose from "mongoose";

const UserProfile = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Basic Details
    name: { type: String, required: true },
    image: { type: String, default: null },
    dob: { type: Date, required: false },

    // Address
    nativeAddress: { type: String },
    currentAddress: { type: String },

    // Contact Details
    phoneCountryCode: { type: String, default: "+91" },
    phoneNumber: { type: String, required: true },
    whatsappNumber: { type: String },
    email: { type: String, required: true },

    // Govt ID
    pan: { type: String },

    // Social Links
    linkedinUrl: { type: String },
    websiteUrl: { type: String },

    // Occupation
    occupation: {
      type: String,
      enum: ["services", "startup_promoter", "business", "other"],
      required: true,
    },

    // When occupation = startup_promoter → required
    occupationDescription: {
      type: String,
      maxlength: 300,
      required: function () {
        return this.occupation === "startup_promoter";
      },
    },

    // When occupation = startup_promoter → required
    supportStageMessage: {
      type: String,
      
    },

    // Membership Type
    membershipType: {
      type: String,
      enum: ["Individual", "Corporate", "Mentor", "Consultant"],
      required: true,
    },

    // Mentor Fields — required when membershipType = "Mentor"
    mentorshipFields: {
      type: [String], // max 5
      validate: {
        validator: function (val) {
          // Only validate if mentor
          if (this.membershipType === "Mentor") {
            return val && val.length > 0 && val.length <= 5;
          }
          return true;
        },
        message: "Mentorship fields required (max 5 keywords)",
      },
    },

    previousExperience: {
      type: String,
      maxlength: 100,
      required: function () {
        return this.membershipType === "Mentor";
      },
    },

    areaOfExpertise: {
      type: String,
      maxlength: 100,
      required: function () {
        return this.membershipType === "Mentor";
      },
    },

    availableForMentorship: {
      type: Boolean,
      required: function () {
        return this.membershipType === "Mentor";
      },
      default: false,
    },

    // Profile Verification
    profileVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("Profile", UserProfile);
