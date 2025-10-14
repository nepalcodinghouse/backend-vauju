import express from "express";
import { getProfile, updateProfile, requireAuth, getMatches, getMessagesUsers} from "../controllers/profileController.js";

const router = express.Router();

// Protected routes
router.get("/", requireAuth, getProfile);
router.put("/", requireAuth, updateProfile);
router.get("/matches", requireAuth, getMatches);
router.get("/messages-users", requireAuth, getMessagesUsers);


export default router;
