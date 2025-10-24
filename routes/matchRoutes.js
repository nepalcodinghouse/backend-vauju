// routes/matchRoutes.js
import express from "express";
import User from "../models/User.js";
import { auth } from "../middleware/auth.js";

const router = express.Router();

// GET /api/matches - Get visibility approved profiles
router.get("/", auth, async (req, res) => {
  try {
    const profiles = await User.find({
      visible: true,
      visibilityApproved: true,
      suspended: { $ne: true },
      isAdmin: { $ne: true }
    })
      .select("name username age gender interests profileImage bio createdAt")
      .sort({ createdAt: -1 });

    res.json(profiles);
  } catch (err) {
    console.error("Fetch matches error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// GET /api/matches/:id - Get profile details
router.get("/:id", auth, async (req, res) => {
  try {
    const profile = await User.findOne({
      _id: req.params.id,
      visible: true,
      visibilityApproved: true,
      suspended: { $ne: true },
      isAdmin: { $ne: true }
    }).select("name username age gender interests profileImage bio createdAt");

    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    res.json(profile);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/matches/notify - Send match notification
router.post("/notify", auth, async (req, res) => {
  try {
    const { recipientId, message } = req.body;
    if (!recipientId) {
      return res.status(400).json({ message: "Missing recipientId" });
    }

    // Emit notification via Socket.IO if available
    const io = req.app?.locals?.io;
    const userSockets = req.app?.locals?.userSockets;
    
    if (io && userSockets) {
      const recipientSockets = userSockets.get(String(recipientId));
      if (recipientSockets && recipientSockets.size > 0) {
        recipientSockets.forEach(socketId => {
          io.to(socketId).emit("matchNotification", {
            from: req.user._id,
            message: message || "You have a new match!",
            timestamp: new Date()
          });
        });
      }
    }

    res.json({ success: true, message: "Notification sent" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
