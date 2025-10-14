import mongoose from "mongoose";
import { isDbConnected } from "../config/db.js";
import { _exported_messageStore } from "./messageController.js";

// GET /api/messages/online-users
// Returns an array of userIds currently considered online
export const onlineUsers = async (req, res) => {
  try {
    const result = new Set();

    // From active websocket connections
    try {
      const userSockets = req.app?.locals?.userSockets;
      if (userSockets) {
        for (const [userId, set] of userSockets.entries()) {
          if (set && set.size > 0) result.add(String(userId));
        }
      }
    } catch (e) {}

    // From presence heartbeat (dev/in-memory) within TTL used in messageController
    try {
      const presence = _exported_messageStore?.presence || {};
      const now = Date.now();
      for (const [userId, ts] of Object.entries(presence)) {
        if (now - ts <= 60_000) result.add(String(userId));
      }
    } catch (e) {}

    // In DB mode, we could also consider a lastSeen field if implemented.
    if (isDbConnected() && mongoose.connection.readyState === 1) {
      // No-op for now; relies on live sockets mainly when DB is present
    }

    return res.json(Array.from(result));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


