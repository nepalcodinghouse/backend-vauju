// routes/matchRoutes.js
import express from "express";
import Match from "../models/Match.js"; // your Match model

const router = express.Router();

// GET /api/matches
router.get("/", async (req, res) => {
  try {
    const matches = await Match.find(); // fetch all matches
    res.json(matches);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
