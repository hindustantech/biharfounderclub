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
      type: [String],
      validate: {
        validator: function (val) {
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

    showMentorshipSection: { // Fixed typo from showMentroshipSection
      type: Boolean,
      default: false,
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

    // Toggle to show/hide mentor in mentor list
    showInMentorSection: {
      type: Boolean,
      default: false,
    },

    // Profile Verification
    profileVerified: { type: Boolean, default: false },

    // Soft delete
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Indexes for better query performance
UserProfile.index({ userId: 1 });
UserProfile.index({ membershipType: 1 });
UserProfile.index({ occupation: 1 });
UserProfile.index({ profileVerified: 1 });
UserProfile.index({ showInMentorSection: 1 });
UserProfile.index({ isActive: 1 });

export default mongoose.model("Profile", UserProfile);