// backend/models/Match.js
import mongoose from "mongoose";

const matchSchema = new mongoose.Schema({
  name: { type: String, required: true },
  age: { type: Number },
  gender: { type: String },
  interests: [String],
  createdAt: { type: Date, default: Date.now },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  matchedUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  status: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending" },
  acceptedAt: { type: Date },
});

const Match = mongoose.model("Match", matchSchema);
export default Match;