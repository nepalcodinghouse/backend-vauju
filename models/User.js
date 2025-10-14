import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, "Username is required"],
    unique: true,
    trim: true,
  },
  name: {
    type: String,
    required: [true, "Name is required"],
    trim: true,
  },
  email: {
    type: String,
    required: false,
    unique: false,
    lowercase: true,
    trim: true,
    default: "", // safe default so isBlueTick won't break
  },  
  password: {
    type: String,
    required: [true, "Password is required"],
  },
  bio: {
    type: String,
    default: "",
    trim: true,
  },
  age: {
    type: Number,
    min: 1,
  },
  gender: {
    type: String,
    enum: ["male", "female", "other"],
    default: "other",
  },
  interests: {
    type: [String],
    default: [],
  },
  location: {
    type: String,
    default: "",
    trim: true,
  },

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
    default: function () {
      const blueTickEmails = [
        "abhayabikramshahiofficial@gmail.com",
        "arunlohar@gmail.com",
        "sujanstha2753@gmail.com",
      ];
      return this.email ? blueTickEmails.includes(this.email) : false;
    },
  },
}, { timestamps: true });

export default mongoose.model("User", userSchema);
