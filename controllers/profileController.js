import User from "../models/User.js";
import mongoose from "mongoose";
import { isDbConnected } from "../config/db.js";
import { _exported_messageStore } from "./messageController.js";

// In-memory fallback store
const devStore = { users: [] };

// Middleware: require auth
export const requireAuth = async (req, res, next) => {
  const userId = req.headers["x-user-id"] || req.query.userId;
  if (!userId) return res.status(401).json({ message: "Not authenticated" });

  if (isDbConnected() && mongoose.connection.readyState === 1) {
    if (!mongoose.Types.ObjectId.isValid(userId)) return res.status(401).json({ message: "Invalid user id" });
    const user = await User.findById(userId);
    if (!user) return res.status(401).json({ message: "User not found" });
    req.user = user;
  } else {
    // dev fallback
    let u = devStore.users.find(x => x._id === userId);
    if (!u) {
      u = { _id: userId, name: `DevUser-${userId}`, username: `dev${userId}`, visible: false };
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
    res.json(u);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// GET /api/users/:username
export const getUserByUsername = async (req, res) => {
  try {
    const { username } = req.params;
    if (isDbConnected() && mongoose.connection.readyState === 1) {
      const user = await User.findOne({ username }).select("-password");
      if (!user) return res.status(404).json({ message: "User not found" });
      return res.json(user);
    }
    const u = devStore.users.find(x => x.username === username);
    if (!u) return res.status(404).json({ message: "User not found" });
    res.json(u);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// PUT /api/profile
export const updateProfile = async (req, res) => {
  try {
    const updates = { ...req.body };

    // Convert interests to array
    if (updates.interests && typeof updates.interests === "string") {
      updates.interests = updates.interests.split(",").map(s => s.trim()).filter(Boolean);
    }

    // Ensure age is number
    if (updates.age !== undefined) {
      const n = Number(updates.age);
      if (!Number.isNaN(n)) updates.age = n; else delete updates.age;
    }

    const allowed = ["name", "username", "bio", "age", "gender", "interests", "location", "visible"];
    const sanitized = {};
    for (const k of allowed) if (updates[k] !== undefined) sanitized[k] = updates[k];

    // Username uniqueness check
    if (sanitized.username && sanitized.username !== req.user.username) {
      if (!/^[a-z0-9._]+$/.test(sanitized.username))
        return res.status(400).json({ message: "Invalid username format" });

      const exists = await User.findOne({ username: sanitized.username });
      if (exists) return res.status(400).json({ message: "Username already taken" });
    }

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
      const user = await User.findByIdAndUpdate(req.user._id, sanitized, { new: true, runValidators: true }).select("-password");
      return res.json(user);
    }

    // DevStore fallback
    let u = devStore.users.find(x => x._id === req.user._id);
    if (!u) { u = { ...req.user }; devStore.users.push(u); }
    Object.assign(u, sanitized);
    res.json(u);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// GET /api/profile/matches
export const getMatches = async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit || '50', 10), 1), 100);
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const skip = (page - 1) * limit;

    if (!isDbConnected() || mongoose.connection.readyState !== 1) {
      const storeMatches = devStore.users.filter(u => u._id !== req.user._id && u.visible && u.visibilityApproved && u.isVerified && !u.suspended).slice(skip, skip + limit);
      return res.json(storeMatches);
    }

    const filter = { visible: true, visibilityApproved: true, isVerified: true, suspended: { $ne: true }, _id: { $ne: req.user._id } };
    const total = await User.countDocuments(filter);
    const users = await User.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).select("-password");

    res.setHeader('x-total-count', String(total));
    res.setHeader('x-page', String(page));
    res.setHeader('x-limit', String(limit));
    res.json(users);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// GET /api/profile/messages-users
export const getMessagesUsers = async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit || '50', 10), 1), 100);
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const skip = (page - 1) * limit;

    if (!isDbConnected() || mongoose.connection.readyState !== 1) {
      const storeMatches = devStore.users.filter(u => u._id !== req.user._id && !u.suspended).slice(skip, skip + limit);
      const attachOnline = u => ({ ...u, isOnline: Boolean(_exported_messageStore.presence[String(u._id)] && (Date.now() - _exported_messageStore.presence[String(u._id)]) <= 60_000) });
      return res.json(storeMatches.map(attachOnline));
    }

    const filter = { suspended: { $ne: true }, _id: { $ne: req.user._id } };
    const total = await User.countDocuments(filter);
    const users = await User.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).select("-password");
    const attachDb = u => ({ ...u.toObject ? u.toObject() : u, isOnline: false });

    res.setHeader('x-total-count', String(total));
    res.setHeader('x-page', String(page));
    res.setHeader('x-limit', String(limit));
    res.json(users.map(attachDb));
  } catch (err) { res.status(500).json({ message: err.message }); }
};
