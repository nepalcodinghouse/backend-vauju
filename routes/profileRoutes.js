import express from "express";
import { getProfile, updateProfile, requireAuth, getMatches, getMessagesUsers, getUserByUsername } from "../controllers/profileController.js";

const router = express.Router();

// Protected routes
router.get("/", requireAuth, getProfile);
router.put("/", requireAuth, updateProfile);
router.get("/matches", requireAuth, getMatches);
router.get("/messages-users", requireAuth, getMessagesUsers);

// Public route to fetch user by username
router.get("/users/:username", getUserByUsername);

export default router;
