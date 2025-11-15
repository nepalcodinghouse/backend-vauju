import User from "../models/User.js";
import mongoose from "mongoose";
import { isDbConnected } from "../config/db.js";
import { _exported_messageStore } from "./messageController.js";
import path from "path";
import fs from "fs";
import { v2 as cloudinary } from "cloudinary";
import sanitizer from "sanitizer";

// Get the sanitize function from the CommonJS module
const { sanitize } = sanitizer;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

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
    if (isDbConnected() && mongoose.connection.readyState === 1) {
      const user = await User.findById(req.user._id).select("-password");
      return res.json(user);
    }
    const u = devStore.users.find(x => x._id === req.user._id) || req.user;
    res.json(u);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/profile
export const updateProfile = async (req, res) => {
  try {
    // Sanitize all input data
    const updates = { ...req.body };
    
    // Sanitize each field
    for (const key in updates) {
      if (typeof updates[key] === 'string') {
        updates[key] = sanitize(updates[key]);
      }
    }

    // Convert interests to array and sanitize each interest
    if (updates.interests && typeof updates.interests === "string") {
      updates.interests = updates.interests.split(",").map(s => sanitize(s.trim())).filter(Boolean);
    } else if (Array.isArray(updates.interests)) {
      updates.interests = updates.interests.map(interest => sanitize(interest));
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
      return res.json(user);
    }

    // DevStore fallback
    let u = devStore.users.find(x => x._id === req.user._id);
    if (!u) { u = { ...req.user }; devStore.users.push(u); }
    Object.assign(u, sanitized);
    res.json(u);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/profile/upload
export const uploadProfileImage = async (req, res) => {
  try {
    if (!req.files || !req.files.profileImage) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    const file = req.files.profileImage;
    if (!file.mimetype.startsWith("image/")) {
      return res.status(400).json({ message: "Invalid file type" });
    }

    const uploadDir = path.join("public", "uploads");
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    const filename = `${Date.now()}-${file.name}`;
    const filePath = path.join(uploadDir, filename);
    await file.mv(filePath);

    if (mongoose.connection.readyState === 1) {
      const user = await User.findByIdAndUpdate(
        req.user._id,
        { profileImage: `/uploads/${filename}` },
        { new: true }
      ).select("-password");
      return res.json({ url: user.profileImage });
    }

    // Dev fallback
    req.user.profileImage = `/uploads/${filename}`;
    res.json({ url: req.user.profileImage });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/profile/matches
export const getMatches = async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit || '50', 10), 1), 100);
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const skip = (page - 1) * limit;

    if (!isDbConnected() || mongoose.connection.readyState !== 1) {
      const storeMatches = devStore.users
        .filter(u => u._id !== req.user._id && u.visible && u.visibilityApproved)
        .slice(skip, skip + limit);
      return res.json(storeMatches);
    }

    const filter = { visible: true, visibilityApproved: true, _id: { $ne: req.user._id } };
    const users = await User.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).select("-password");
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

    const usersList = !isDbConnected() || mongoose.connection.readyState !== 1
      ? devStore.users.filter(u => u._id !== req.user._id)
      : await User.find({ _id: { $ne: req.user._id } }).sort({ updatedAt: -1 }).skip(skip).limit(limit).select("-password");

    const usersWithOnline = usersList.map(u => {
      const lastSeen = _exported_messageStore.presence[String(u._id)];
      return { ...u.toObject?.() || u, isOnline: Boolean(lastSeen && (Date.now() - lastSeen) <= 60_000) };
    });

    res.json(usersWithOnline);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Profile picture upload
export const uploadProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // Check Cloudinary configuration
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      console.warn('⚠️ Cloudinary not configured, using local storage fallback');
      return uploadProfilePictureLocal(req, res);
    }

    // Convert buffer to base64 for Cloudinary upload
    const base64 = req.file.buffer.toString('base64');
    const dataURI = `data:${req.file.mimetype};base64,${base64}`;

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(dataURI, {
      folder: `vauju-dating-app/profile-pictures`,
      public_id: `${req.user._id}_${Date.now()}`,
      resource_type: 'auto',
      quality: 'auto',
      fetch_format: 'auto',
    });

    const imageUrl = result.secure_url;
    const publicId = result.public_id;

    // Update user profile with Cloudinary URL
    if (isDbConnected() && mongoose.connection.readyState === 1) {
      const user = await User.findByIdAndUpdate(
        req.user._id,
        {
          profileImage: imageUrl,
          profilePicPublicId: publicId, // Store for deletion later
        },
        { new: true, runValidators: true }
      ).select("-password");
      
      return res.json({
        success: true,
        url: imageUrl,
        publicId: publicId,
        message: "Profile picture updated successfully!",
        user,
      });
    }

    // Dev fallback
    req.user.profileImage = imageUrl;
    req.user.profilePicPublicId = publicId;
    res.json({
      success: true,
      url: imageUrl,
      publicId: publicId,
      message: "Profile picture updated successfully!",
      user: req.user,
    });

  } catch (err) {
    console.error('Cloudinary upload error:', err);
    // Fallback to local storage if Cloudinary fails
    return uploadProfilePictureLocal(req, res);
  }
};

// Local storage fallback function
const uploadProfilePictureLocal = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const uploadDir = path.resolve('uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const fileExtension = path.extname(req.file.originalname);
    const fileName = `${req.user._id}_${Date.now()}${fileExtension}`;
    const filePath = path.join(uploadDir, fileName);

    // Save file to disk
    fs.writeFileSync(filePath, req.file.buffer);

    const imageUrl = `/uploads/${fileName}`;

    // Update user profile with local URL
    if (isDbConnected() && mongoose.connection.readyState === 1) {
      const user = await User.findByIdAndUpdate(
        req.user._id,
        { profileImage: imageUrl },
        { new: true, runValidators: true }
      ).select("-password");
      
      return res.json({
        success: true,
        url: imageUrl,
        message: "Profile picture updated successfully (local storage)!",
        user,
      });
    }

    // Dev fallback
    req.user.profileImage = imageUrl;
    res.json({
      success: true,
      url: imageUrl,
      message: "Profile picture updated successfully (local storage)!",
      user: req.user,
    });
  } catch (err) {
    console.error('Local upload error:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to upload image',
    });
  }
};

// Delete profile picture from Cloudinary
export const deleteProfilePicture = async (req, res) => {
  try {
    const { publicId } = req.params;

    if (!publicId) {
      return res.status(400).json({ message: "Public ID is required" });
    }

    // Check if Cloudinary is configured
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      return res.status(400).json({
        success: false,
        message: "Cloudinary not configured",
      });
    }

    // Delete from Cloudinary
    const result = await cloudinary.uploader.destroy(publicId);

    if (result.result === 'ok') {
      // Update user to remove profile picture
      if (isDbConnected() && mongoose.connection.readyState === 1) {
        await User.findByIdAndUpdate(
          req.user._id,
          {
            profileImage: null,
            profilePicPublicId: null,
          },
          { new: true, runValidators: true }
        );
      }

      return res.json({
        success: true,
        message: "Profile picture deleted successfully!",
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "Failed to delete image from cloud",
      });
    }
  } catch (err) {
    console.error('Delete profile picture error:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to delete profile picture',
    });
  }
};