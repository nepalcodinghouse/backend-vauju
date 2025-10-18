import User from "../models/User.js";

// Simple static admin credentials (no JWT for simplicity)
const ADMIN_USER = "admin";
const ADMIN_PASS = "admin123";
const ADMIN_TOKEN = "static-admin-token";
const ADMIN_EMAIL = "admin@vauju.app"; // 👈 your special admin email

export const adminLogin = async (req, res) => {
  try {
    const { username, password } = req.body || {};

    // ✅ Case 1: Login with hardcoded admin username/password
    if (username === ADMIN_USER && password === ADMIN_PASS) {
      return res.json({ token: ADMIN_TOKEN });
    }

    // ✅ Case 2: Direct login for specific admin email (no password needed)
    const user = await User.findOne({ email: username });
    if (user && user.email === ADMIN_EMAIL) {
      return res.json({ token: ADMIN_TOKEN });
    }

    // ❌ Invalid credentials
    return res.status(401).json({ message: "Invalid admin credentials" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const requireAdmin = (req, res, next) => {
  const token =
    req.headers["x-admin-token"] ||
    req.headers["authorization"]?.replace("Bearer ", "");

  if (!token || token !== ADMIN_TOKEN) {
    return res.status(401).json({ message: "Admin authorization required" });
  }

  next();
};

export const listUsers = async (req, res) => {
  try {
    const { q, pendingVisibility } = req.query;
    const filter = {};

    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
      ];
    }

    if (pendingVisibility === "true") {
      filter.visibilityRequested = true;
      filter.visibilityApproved = false;
    }

    const users = await User.find(filter)
      .select("-password")
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

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
    res.status(500).json({ message: err.message });
  }
};

export const setVerify = async (req, res) => {
  try {
    const { userId } = req.params;
    const { verified } = req.body || {};
    const isVerified = Boolean(verified);

    const update = isVerified
      ? {
          isVerified: true,
          visibilityApproved: true,
          visibilityRequested: false,
          visible: true,
        }
      : {
          isVerified: false,
          visibilityApproved: false,
          visibilityRequested: false,
          visible: false,
        };

    const user = await User.findByIdAndUpdate(userId, update, { new: true }).select(
      "-password"
    );

    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const setSuspend = async (req, res) => {
  try {
    const { userId } = req.params;
    const { suspended } = req.body || {};

    const user = await User.findByIdAndUpdate(
      userId,
      { suspended: Boolean(suspended) },
      { new: true }
    ).select("-password");

    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findByIdAndDelete(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ message: "User deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
