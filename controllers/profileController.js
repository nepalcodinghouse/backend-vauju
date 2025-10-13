import User from "../models/User.js";
import mongoose from "mongoose";
import { isDbConnected } from "../config/db.js";
import { isUserOnline, _exported_messageStore } from "./messageController.js";

// In-memory fallback store for dev when DB is unavailable
const devStore = { users: [] };
// Photo uploads removed — no multer or file storage

// Middleware: require auth (simple, expects req.user from token in real app)
export const requireAuth = async (req, res, next) => {
  // For demo: get user from token in localStorage (not secure, just for demo)
  // In real app, use JWT in headers
  const userId = req.headers["x-user-id"] || req.query.userId;
  if (!userId) return res.status(401).json({ message: "Not authenticated" });
  if (isDbConnected() && mongoose.connection.readyState === 1) {
    // Validate ObjectId to avoid mongoose CastError when header contains invalid values
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ message: "Invalid user id" });
    }
    const user = await User.findById(userId);
    if (!user) return res.status(401).json({ message: "User not found" });
    req.user = user;
  } else {
    // dev fallback: create or find a user in the in-memory store
    let u = devStore.users.find(x => x._id === userId);
    if (!u) {
      u = { _id: userId, name: `DevUser-${userId}`, email: `${userId}@local`, visible: false };
      devStore.users.push(u);
    }
    req.user = u;
  }
  next();
};

// GET /api/profile
export const getProfile = async (req, res) => {
  try {
    if (isDbConnected() && mongoose.connection.readyState === 1) {
      const user = await User.findById(req.user._id).select("-password");
      return res.json(user);
    }
    const u = devStore.users.find(x => x._id === req.user._id) || req.user;
    return res.json(u);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/profile
export const updateProfile = async (req, res) => {
  try {
    const updates = { ...req.body };

    // If interests is a comma-separated string, convert to array
    if (updates.interests && typeof updates.interests === "string") {
      updates.interests = updates.interests.split(",").map((s) => s.trim()).filter(Boolean);
    }

    // Ensure age is a number when provided
    if (updates.age !== undefined) {
      const n = Number(updates.age);
      if (!Number.isNaN(n)) updates.age = n; else delete updates.age;
    }

    // photo upload support removed

    // Only allow updating a safe set of fields (visibility is handled specially)
    const allowed = ["name", "bio", "age", "gender", "interests", "location", "visible"];
    const sanitized = {};
    for (const k of allowed) if (updates[k] !== undefined) sanitized[k] = updates[k];

    // Visibility requests: if user enables visibility, mark request instead of immediate exposure
    if (Object.prototype.hasOwnProperty.call(sanitized, "visible")) {
      if (sanitized.visible === true) {
        sanitized.visible = false; // not immediately visible until admin approves
        sanitized.visibilityRequested = true;
        sanitized.visibilityApproved = false;
      } else {
        // User turned off visibility; reset flags
        sanitized.visible = false;
        sanitized.visibilityRequested = false;
        sanitized.visibilityApproved = false;
      }
    }

    if (isDbConnected() && mongoose.connection.readyState === 1) {
      const user = await User.findByIdAndUpdate(req.user._id, sanitized, { new: true, runValidators: true }).select("-password");
      return res.json(user);
    }
    // devStore fallback: update or create
    let u = devStore.users.find(x => x._id === req.user._id);
    if (!u) {
      u = { ...req.user };
      devStore.users.push(u);
    }
    Object.assign(u, sanitized);
    return res.json(u);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/profile/matches
export const getMatches = async (req, res) => {
  try {
    // Optional pagination (defaults)
    const limit = Math.min(Math.max(parseInt(req.query.limit || '50', 10), 1), 100);
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const skip = (page - 1) * limit;
    // If no DB configured or not connected, return demo matches or devStore users for dev/testing
    if (!isDbConnected() || mongoose.connection.readyState !== 1) {
      // prefer real devStore users if present
      const storeMatches = devStore.users
        .filter(u => u._id !== req.user._id && u.visible && u.visibilityApproved && u.isVerified && !u.suspended)
        .slice(skip, skip + limit);
      // include current user at the front so the UI can show 'available to me' as requested
      const current = devStore.users.find(u => u._id === req.user._id) || req.user;
      if (storeMatches && storeMatches.length > 0) {
        // attach isOnline using messageController's presence store
        const attach = (u) => ({ ...u, isOnline: Boolean(_exported_messageStore.presence[String(u._id)] && (Date.now() - _exported_messageStore.presence[String(u._id)]) <= 60_000) });
        return res.json(storeMatches.map(attach));
      }
      // otherwise return a small demo set so UI isn't empty
      const demo = [
        { _id: "demo-1", name: "Demo Alice", age: 28, interests: ["music", "hiking"] },
        { _id: "demo-2", name: "Demo Bob", age: 30, interests: ["coding", "coffee"] },
      ];
  // demo scenario without including current user
  return res.json(demo.map(d => ({ ...d, isOnline: false })));
    }

    // Return only other users who are approved, visible and not suspended
    const baseFilter = { visible: true, visibilityApproved: true, isVerified: true, suspended: { $ne: true }, _id: { $ne: req.user._id } };
    const total = await User.countDocuments(baseFilter);
    const users = await User.find(baseFilter)
      .sort({ updatedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select("-password");
    const attachDb = (u) => ({ ...u.toObject ? u.toObject() : u, isOnline: false });
    res.setHeader('x-total-count', String(total));
    res.setHeader('x-page', String(page));
    res.setHeader('x-limit', String(limit));
    res.json(users.map(attachDb));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
