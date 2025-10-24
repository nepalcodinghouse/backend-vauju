// routes/matchRoutes.js
import express from "express";
import Match from "../models/Match.js";
import { auth } from "../middleware/auth.js";

const router = express.Router();

// GET /api/matches - Get user-specific matches
router.get("/", auth, async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Fetch matches for the current user - populate user details
    const matches = await Match.find({
      $or: [
        { userId: userId },
        { matchedUserId: userId }
      ]
    })
    .populate('userId', 'name age gender interests')
    .populate('matchedUserId', 'name age gender interests')
    .sort({ createdAt: -1 });
    
    if (!matches || matches.length === 0) {
      return res.json([]);
    }
    
    res.json(matches);
  } catch (err) {
    console.error("Fetch matches error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// GET /api/matches/:id - Get single match details
router.get("/:id", auth, async (req, res) => {
  try {
    const match = await Match.findById(req.params.id)
      .populate('userId', 'name age gender interests')
      .populate('matchedUserId', 'name age gender interests');
    
    if (!match) {
      return res.status(404).json({ message: "Match not found" });
    }
    res.json(match);
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
