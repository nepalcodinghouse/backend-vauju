import User from "../models/User.js";
import mongoose from "mongoose";
import { isDbConnected } from "../config/db.js";
import { _exported_messageStore } from "./messageController.js";
import { CacheService } from "../redis/cacheService.js";

// In-memory fallback store
const devStore = { users: [] };

// Middleware: require auth
export const requireAuth = async (req, res, next) => {
  const userId = req.headers["x-user-id"] || req.query.userId;
  if (!userId) return res.status(401).json({ message: "Not authenticated" });

  if (isDbConnected() && mongoose.connection.readyState === 1) {
    if (!mongoose.Types.ObjectId.isValid(userId))
      return res.status(401).json({ message: "Invalid user id" });
    const user = await User.findById(userId);
    if (!user) return res.status(401).json({ message: "User not found" });
    req.user = user;
  } else {
    // dev fallback
    let u = devStore.users.find(x => x._id === userId);
    if (!u) {
      u = { _id: userId, name: `DevUser-${userId}`, email: `dev${userId}@test.com`, visible: false };
      devStore.users.push(u);
    }
    req.user = u;
  }
  next();
};

// GET /api/profile
export const getProfile = async (req, res) => {
  try {
    const userId = String(req.user._id);
    
    // Try to get from Redis cache first
    const cachedProfile = await CacheService.getUserProfile(userId);
    if (cachedProfile) {
      return res.json(cachedProfile);
    }
    
    if (isDbConnected() && mongoose.connection.readyState === 1) {
      const user = await User.findById(req.user._id).select("-password");
      
      // Cache the profile for future requests
      if (user) {
        await CacheService.cacheUserProfile(userId, user);
      }
      
      return res.json(user);
    }
    
    const u = devStore.users.find(x => x._id === req.user._id) || req.user;
    
    // Cache the dev user profile
    await CacheService.cacheUserProfile(userId, u);
    
    res.json(u);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/profile
export const updateProfile = async (req, res) => {
  try {
    const userId = String(req.user._id);
    const updates = { ...req.body };

    // Convert interests to array
    if (updates.interests && typeof updates.interests === "string") {
      updates.interests = updates.interests.split(",").map(s => s.trim()).filter(Boolean);
    }

    // Ensure age is number
    if (updates.age !== undefined) {
      const n = Number(updates.age);
      if (!Number.isNaN(n)) updates.age = n;
      else delete updates.age;
    }

    const allowed = ["name", "bio", "age", "gender", "interests", "location", "visible"];
    const sanitized = {};
    for (const k of allowed) if (updates[k] !== undefined) sanitized[k] = updates[k];

    // Visibility admin workflow
    if (Object.prototype.hasOwnProperty.call(sanitized, "visible")) {
      if (sanitized.visible === true) {
        sanitized.visible = false;
        sanitized.visibilityRequested = true;
        sanitized.visibilityApproved = false;
      } else {
        sanitized.visible = false;
        sanitized.visibilityRequested = false;
        sanitized.visibilityApproved = false;
      }
    }

    if (isDbConnected() && mongoose.connection.readyState === 1) {
      const user = await User.findByIdAndUpdate(
        req.user._id,
        sanitized,
        { new: true, runValidators: true }
      ).select("-password");
      
      // Invalidate user's profile cache
      await CacheService.invalidateUserProfile(userId);
      
      // Invalidate user's matches cache (since profile changed)
      await CacheService.invalidateAllMatches(userId);
      
      // Cache the updated profile
      if (user) {
        await CacheService.cacheUserProfile(userId, user);
      }
      
      return res.json(user);
    }

    // DevStore fallback
    let u = devStore.users.find(x => x._id === req.user._id);
    if (!u) { u = { ...req.user }; devStore.users.push(u); }
    Object.assign(u, sanitized);
    
    // Invalidate and update cache for dev store
    await CacheService.invalidateUserProfile(userId);
    await CacheService.cacheUserProfile(userId, u);
    
    res.json(u);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/profile/matches
export const getMatches = async (req, res) => {
  try {
    const userId = String(req.user._id);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '50', 10), 1), 100);
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const skip = (page - 1) * limit;

    // Try to get from Redis cache first
    const cachedMatches = await CacheService.getMatches(userId, page);
    if (cachedMatches) {
      res.setHeader('x-total-count', String(cachedMatches.total || cachedMatches.length));
      res.setHeader('x-page', String(page));
      res.setHeader('x-limit', String(limit));
      return res.json(cachedMatches.users || cachedMatches);
    }

    if (!isDbConnected() || mongoose.connection.readyState !== 1) {
      const storeMatches = devStore.users
        .filter(u => u._id !== req.user._id && u.visible && u.visibilityApproved && u.isVerified && !u.suspended)
        .slice(skip, skip + limit);
      
      // Cache the dev store matches
      await CacheService.cacheMatches(userId, page, storeMatches);
      
      return res.json(storeMatches);
    }

    const filter = { visible: true, visibilityApproved: true, isVerified: true, suspended: { $ne: true }, _id: { $ne: req.user._id } };
    const total = await User.countDocuments(filter);
    const users = await User.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).select("-password");

    // Cache the matches with metadata
    const matchData = { users, total, page, limit };
    await CacheService.cacheMatches(userId, page, matchData);

    res.setHeader('x-total-count', String(total));
    res.setHeader('x-page', String(page));
    res.setHeader('x-limit', String(limit));
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/profile/messages-users
export const getMessagesUsers = async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit || '50', 10), 1), 100);
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const skip = (page - 1) * limit;

    if (!isDbConnected() || mongoose.connection.readyState !== 1) {
      const storeMatches = devStore.users
        .filter(u => u._id !== req.user._id && !u.suspended)
        .slice(skip, skip + limit);
      
      // Enhanced online status check using Redis
      const attachOnline = async (u) => {
        const isOnlineRedis = await CacheService.isUserOnline(String(u._id));
        const isOnlineFallback = Boolean(_exported_messageStore.presence[String(u._id)] && (Date.now() - _exported_messageStore.presence[String(u._id)]) <= 60_000);
        
        return {
          ...u,
          isOnline: isOnlineRedis || isOnlineFallback
        };
      };
      
      const usersWithOnlineStatus = await Promise.all(storeMatches.map(attachOnline));
      return res.json(usersWithOnlineStatus);
    }

    const filter = { suspended: { $ne: true }, _id: { $ne: req.user._id } };
    const total = await User.countDocuments(filter);
    const users = await User.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).select("-password");

    // Enhanced online status attachment using Redis
    const attachDb = async (u) => {
      const isOnline = await CacheService.isUserOnline(String(u._id));
      return { ...u.toObject(), isOnline };
    };
    
    const usersWithOnlineStatus = await Promise.all(users.map(attachDb));
    
    res.setHeader('x-total-count', String(total));
    res.setHeader('x-page', String(page));
    res.setHeader('x-limit', String(limit));
    res.json(usersWithOnlineStatus);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
