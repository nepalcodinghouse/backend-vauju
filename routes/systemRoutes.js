import express from "express";
import { _exported_messageStore } from "../controllers/messageController.js";

const router = express.Router();

// Get presence statistics
router.get("/presence/stats", async (req, res) => {
  try {
    const presenceService = req.app.locals.presenceService;
    const stats = presenceService
      ? await presenceService.getPresenceStats()
      : {
          onlineCount: Object.keys(_exported_messageStore.presence).length,
          lastSeen: _exported_messageStore.presence,
        };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get presence stats",
      error: error.message
    });
  }
});

// Get online users list
router.get("/presence/online", async (req, res) => {
  try {
    const now = Date.now();
    const onlineUsers = Object.entries(_exported_messageStore.presence)
      .filter(([_, ts]) => now - ts <= 60_000)
      .map(([userId]) => userId);

    res.json({
      success: true,
      data: {
        count: onlineUsers.length,
        users: onlineUsers
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get online users",
      error: error.message
    });
  }
});

// Check if specific user is online
router.get("/presence/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const ts = _exported_messageStore.presence[userId];
    const isOnline = Boolean(ts && (Date.now() - ts <= 60_000));

    res.json({
      success: true,
      data: {
        userId,
        isOnline,
        lastSeen: ts || null
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to check user presence",
      error: error.message
    });
  }
});

// Invalidate user's cache (no Redis, just placeholder)
router.delete("/cache/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    // With Redis removed, just return success
    res.json({
      success: true,
      message: `Cache invalidation skipped for user ${userId} (Redis removed)`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to invalidate user cache",
      error: error.message
    });
  }
});

// Health check endpoint
router.get("/health", async (req, res) => {
  try {
    const presenceService = req.app.locals.presenceService;
    const health = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      services: {
        presence: presenceService ? "active" : "inactive",
        socketIO: req.app.locals.io ? "active" : "inactive"
      }
    };

    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Health check failed",
      error: error.message,
      services: {
        presence: "error",
        socketIO: "error"
      }
    });
  }
});

export default router;
