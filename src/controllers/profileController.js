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

    // Only allow updating a safe set of fields
    const allowed = ["name", "bio", "age", "gender", "interests", "location", "visible"];
    const sanitized = {};
    for (const k of allowed) if (updates[k] !== undefined) sanitized[k] = updates[k];

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
    // If no DB configured or not connected, return demo matches or devStore users for dev/testing
    if (!isDbConnected() || mongoose.connection.readyState !== 1) {
      // prefer real devStore users if present
      const storeMatches = devStore.users.filter(u => u._id !== req.user._id && u.visible);
      // include current user at the front so the UI can show 'available to me' as requested
      const current = devStore.users.find(u => u._id === req.user._id) || req.user;
      if (storeMatches && storeMatches.length > 0) {
        // ensure current user is included (prepend) and return
        // attach isOnline using messageController's presence store
        const attach = (u) => ({ ...u, isOnline: Boolean(_exported_messageStore.presence[String(u._id)] && (Date.now() - _exported_messageStore.presence[String(u._id)]) <= 60_000) });
        const withCurrent = [attach(current), ...storeMatches.map(attach)];
          return res.json(withCurrent);
      }
      // otherwise return a small demo set so UI isn't empty
      const demo = [
        { _id: "demo-1", name: "Demo Alice", age: 28, interests: ["music", "hiking"] },
        { _id: "demo-2", name: "Demo Bob", age: 30, interests: ["coding", "coffee"] },
      ];
  // include current user as first entry in demo scenario
  return res.json([{ ...req.user, isOnline: false }, ...demo.map(d => ({ ...d, isOnline: false }))]);
    }

    // Return other users who opted into visibility
    let users = await User.find({ visible: true, _id: { $ne: req.user._id } }).select("-password");
    if (!users || users.length === 0) {
      // Fallback: no one opted in yet — return other users anyway
      users = await User.find({ _id: { $ne: req.user._id } }).select("-password");
    }
    // Ensure current user is included at front
    const currentUser = await User.findById(req.user._id).select("-password");
    const alreadyIncluded = users.some(u => String(u._id) === String(currentUser._id));
  // attach isOnline if we have presence data (dev fallback); otherwise default false
  const attachDb = (u) => ({ ...u.toObject ? u.toObject() : u, isOnline: false });
  const result = alreadyIncluded ? users.map(attachDb) : [attachDb(currentUser), ...users.map(attachDb)];
  res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
