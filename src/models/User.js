import mongoose from "mongoose";


const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  bio: { type: String, default: "" },
  age: { type: Number },
  gender: { type: String, enum: ["male", "female", "other"], default: "other" },
  // photo field removed - profile images are no longer supported
  interests: { type: [String], default: [] },
  location: { type: String, default: "" },
  visible: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model("User", userSchema);
