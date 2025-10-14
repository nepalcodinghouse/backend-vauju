import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },

  // Username for /@username URLs
  username: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[a-z0-9._]+$/, 'Username can only contain letters, numbers, dots, and underscores']
  },

  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  bio: { type: String, default: "" },
  age: { type: Number },
  gender: { type: String, enum: ["male", "female", "other"], default: "other" },
  interests: { type: [String], default: [] },
  location: { type: String, default: "" },

  // User controls
  visible: { type: Boolean, default: false },
  visibilityRequested: { type: Boolean, default: false },
  visibilityApproved: { type: Boolean, default: false },
  isVerified: { type: Boolean, default: false },
  suspended: { type: Boolean, default: false },
  isAdmin: { type: Boolean, default: false },

  // Blue tick for VIP
  isBlueTick: {
    type: Boolean,
    default: function() {
      const blueTickEmails = [
        "abhayabikramshahiofficial@gmail.com",
        "arunlohar@gmail.com",
        "sujanstha2753@gmail.com"
      ];
      return blueTickEmails.includes(this.email);
    }
  },
}, { timestamps: true });

export default mongoose.model("User", userSchema);
