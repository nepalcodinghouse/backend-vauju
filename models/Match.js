// models/Match.js
import mongoose from "mongoose";

const matchSchema = new mongoose.Schema({
  name: { type: String, required: true },
  age: { type: Number },
  gender: { type: String },
  interests: [String],
  createdAt: { type: Date, default: Date.now },
});

const Match = mongoose.model("Match", matchSchema);
export default Match;
