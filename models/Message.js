import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  from: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  to: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  // Store encrypted message content
  encryptedContent: {
    type: String,
    required: true,
  },
  // Store encryption key hash for verification
  contentKeyHash: {
    type: String,
    required: true,
  },
  seen: {
    type: Boolean,
    default: false,
  },
  isUnsent: {
    type: Boolean,
    default: false,
  },
  deletedFor: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  }
});

// Update the updatedAt field before saving
messageSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

const Message = mongoose.model("Message", messageSchema);

export default Message;