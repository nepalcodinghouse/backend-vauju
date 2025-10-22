import express from "express";
import User from "../models/User.js"; // use your User model

const router = express.Router();

// GET /api/matches
router.get("/", async (req, res) => {
  try {
    // Fetch some sample matches (you can limit or sort as needed)
    const matches = await User.find({ visible: true }).limit(10).lean();

    // Ensure our VIP user is included and marked verified
    const vipUserEmail = "abhayabikramshahiofficial@gmail.com";
    const vipUser = await User.findOne({ email: vipUserEmail }).lean();

    if (vipUser && !matches.find((m) => m.email === vipUserEmail)) {
      vipUser.isVerified = true; // force verified/blue tick
      matches.unshift(vipUser); // add VIP user at the top
    }

    res.json(matches);
  } catch (err) {
    console.error("Error fetching matches:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
