// backend/models/Match.js
import mongoose from "mongoose";
import User from "./User.js"; // make sure this path is correct

const matchSchema = new mongoose.Schema({
  name: { type: String, required: true },
  age: { type: Number },
  gender: { type: String },
  interests: [String],
  imageUrl: { type: String }, // 👈 added image field
  createdAt: { type: Date, default: Date.now },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  matchedUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  status: {
    type: String,
    enum: ["pending", "accepted", "rejected"],
    default: "pending",
  },
  acceptedAt: { type: Date },
});

// 👇 Automatically assign specific image for specific email
matchSchema.pre("save", async function (next) {
  try {
    const user = await User.findById(this.userId);
    if (user && user.email) {
      const specialEmails = {
        "tmgr0440@gmail.com":
          "https://ik.imagekit.io/yugalmeet/WhatsApp%20Image%202025-10-27%20at%2019.51.23_d41f02d9.jpg?updatedAt=1761575390694",
      };

      if (specialEmails[user.email]) {
        this.imageUrl = specialEmails[user.email];
      }
    }
    next();
  } catch (err) {
    next(err);
  }
});

const Match = mongoose.model("Match", matchSchema);
export default Match;
