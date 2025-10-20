import express from "express";
import User from "../models/User.js";

const router = express.Router();

// GET /api/users/:username
router.get("/@:username", async (req, res) => {
  try {
    const { username } = req.params;

    // Find by username instead of id
    const user = await User.findOne({ username }).select("-password");

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json(user);
  } catch (err) {
    console.error("Error fetching user:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
