import express from "express";
import { CacheService } from "../redis/cacheService.js";

const router = express.Router();

// Get cache statistics
router.get("/cache/stats", async (req, res) => {
  try {
    const stats = await CacheService.getCacheStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get cache stats",
      error: error.message
    });
  }
});

// Clear all cache (admin only)
router.delete("/cache/clear", async (req, res) => {
  try {
    await CacheService.clearAllCache();
    res.json({
      success: true,
      message: "Cache cleared successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to clear cache",
      error: error.message
    });
  }
});

// Get presence statistics
router.get("/presence/stats", async (req, res) => {
  try {
    const presenceService = req.app.locals.presenceService;
    if (!presenceService) {
      return res.status(503).json({
        success: false,
        message: "Presence service not available"
      });
    }

    const stats = await presenceService.getPresenceStats();
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
    const onlineUsers = await CacheService.getOnlineUsers();
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
    const isOnline = await CacheService.isUserOnline(userId);
    const presence = await CacheService.getUserPresence(userId);
    
    res.json({
      success: true,
      data: {
        userId,
        isOnline,
        presence
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

// Invalidate user's cache
router.delete("/cache/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Invalidate all cache entries for this user
    await CacheService.invalidateUserProfile(userId);
    await CacheService.invalidateAllMatches(userId);
    await CacheService.invalidateUserSession(userId);
    
    res.json({
      success: true,
      message: `Cache invalidated for user ${userId}`
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
    // Check Redis connection
    const cacheStats = await CacheService.getCacheStats();
    const presenceService = req.app.locals.presenceService;
    
    const health = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      services: {
        redis: cacheStats ? "connected" : "disconnected",
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
        redis: "error",
        presence: "error",
        socketIO: "error"
      }
    });
  }
});

export default router;
