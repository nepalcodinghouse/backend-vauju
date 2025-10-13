import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema({
  from: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  to: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  text: { type: String, required: true },
  seen: { type: Boolean, default: false },
  // Soft deletion and unsend support
  deletedFor: { type: [mongoose.Schema.Types.ObjectId], default: [] }, // users who should not see this message
  isUnsent: { type: Boolean, default: false }, // if sender unsent, hide content for both sides
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Message", MessageSchema);
