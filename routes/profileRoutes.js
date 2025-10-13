import express from "express";
import { getProfile, updateProfile, requireAuth, getMatches } from "../controllers/profileController.js";

const router = express.Router();

// All routes require auth
router.get("/", requireAuth, getProfile);
router.put("/", requireAuth, updateProfile);
router.get("/matches", requireAuth, getMatches);

export default router;
