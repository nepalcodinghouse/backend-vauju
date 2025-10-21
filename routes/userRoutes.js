import express from "express";
import User from "../models/User.js";

const router = express.Router();

// GET /api/users/:username
router.get("/@:username", async (req, res) => {
  try {
    let { username } = req.params;

    // Sanitize input
    username = username.trim().toLowerCase();

    // Find user by username (case-insensitive)
    const user = await User.findOne({ username })
      .select("-password"); // hide password

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Optional: block suspended users
    if (user.suspended) {
      return res.status(403).json({ message: "This user is suspended" });
    }

    res.json(user);
  } catch (err) {
    console.error("Error fetching user:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
