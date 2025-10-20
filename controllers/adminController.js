import User from "../models/User.js";

// Load env variables for admin
const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASS = process.env.ADMIN_PASS || "admin123";
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "static-admin-token";

// ------------------- ADMIN LOGIN -------------------
export const adminLogin = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required" });
    }

    if (username === ADMIN_USER && password === ADMIN_PASS) {
      return res.status(200).json({ token: ADMIN_TOKEN });
    }

    return res.status(401).json({ message: "Invalid admin credentials" });
  } catch (err) {
    console.error("Admin login error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ------------------- ADMIN MIDDLEWARE -------------------
export const requireAdmin = (req, res, next) => {
  const token = req.headers["x-admin-token"] || req.headers["authorization"]?.replace("Bearer ", "");
  if (!token || token !== ADMIN_TOKEN) {
    return res.status(401).json({ message: "Admin authorization required" });
  }
  next();
};

// ------------------- LIST USERS -------------------
export const listUsers = async (req, res) => {
  try {
    const { q, pendingVisibility } = req.query;
    const filter = {};

    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
        { username: { $regex: q, $options: "i" } },
      ];
    }

    if (pendingVisibility === "true") {
      filter.visibilityRequested = true;
      filter.visibilityApproved = false;
    }

    const users = await User.find(filter).select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    console.error("List users error:", err);
    res.status(500).json({ message: err.message });
  }
};

// ------------------- APPROVE VISIBILITY -------------------
export const approveVisibility = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findByIdAndUpdate(
      userId,
      { visibilityApproved: true, visibilityRequested: false, visible: true },
      { new: true }
    ).select("-password");

    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    console.error("Approve visibility error:", err);
    res.status(500).json({ message: err.message });
  }
};

// ------------------- SET VERIFY -------------------
export const setVerify = async (req, res) => {
  try {
    const { userId } = req.params;
    const { verified } = req.body;

    const isVerified = Boolean(verified);
    const update = isVerified
      ? { isVerified: true, visibilityApproved: true, visibilityRequested: false, visible: true }
      : { isVerified: false, visibilityApproved: false, visibilityRequested: false, visible: false };

    const user = await User.findByIdAndUpdate(userId, update, { new: true }).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    console.error("Set verify error:", err);
    res.status(500).json({ message: err.message });
  }
};

// ------------------- SET SUSPEND -------------------
export const setSuspend = async (req, res) => {
  try {
    const { userId } = req.params;
    const { suspended } = req.body;

    const user = await User.findByIdAndUpdate(userId, { suspended: Boolean(suspended) }, { new: true }).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    console.error("Set suspend error:", err);
    res.status(500).json({ message: err.message });
  }
};

// ------------------- DELETE USER -------------------
export const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findByIdAndDelete(userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ message: "User deleted" });
  } catch (err) {
    console.error("Delete user error:", err);
    res.status(500).json({ message: err.message });
  }
};
