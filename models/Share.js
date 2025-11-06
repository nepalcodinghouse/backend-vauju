import mongoose from "mongoose";

const shareSchema = new mongoose.Schema(
  {
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    sharedAt: {
      type: Date,
      required: true,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Index for faster queries
shareSchema.index({ postId: 1 });
shareSchema.index({ userId: 1 });
shareSchema.index({ postId: 1, createdAt: -1 });

const Share = mongoose.model("Share", shareSchema);

export default Share;
