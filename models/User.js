import mongoose from "mongoose";

// List of emails for automatic blue tick
const BLUE_TICK_EMAILS = [
  "abhayabikramshahiofficial@gmail.com",
  "arunlohar@gmail.com",
  "sujanstha2753@gmail.com",
];

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      default: "",
      validate: {
        validator: function (v) {
          // Only allow valid emails if provided
          return v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: (props) => `${props.value} is not a valid email!`,
      },
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
      min: [1, "Age must be at least 1"],
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
    profileImage: {
      type: String,
      default: "", // can replace with default avatar URL
      trim: true,
    },

    // User controls
    visible: { type: Boolean, default: false },
    visibilityRequested: { type: Boolean, default: false },
    visibilityApproved: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false },
    suspended: { type: Boolean, default: false },
    isAdmin: { type: Boolean, default: false },

    // Blue tick for VIP users
    isBlueTick: {
      type: Boolean,
      default: function () {
        // ensure this.email exists before checking
        return this.email ? BLUE_TICK_EMAILS.includes(this.email) : false;
      },
    },

    // Post permissions
    canPost: {
      type: Boolean,
      default: function () {
        // Users with blue tick can post by default
        return this.email ? BLUE_TICK_EMAILS.includes(this.email) : false;
      },
    },
  },
  { timestamps: true }
);

// Remove password automatically from responses
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

// Pre-save hook to prevent inserting users without required fields
userSchema.pre("save", function (next) {
  if (!this.name || !this.username || !this.password) {
    return next(new Error("Missing required fields: name, username, or password"));
  }
  next();
});

export default mongoose.model("User", userSchema);
