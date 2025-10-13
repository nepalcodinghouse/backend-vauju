import express from "express";
import { requireAuth } from "../controllers/profileController.js";
import { sendMessage, getConversation, markSeen, heartbeat } from "../controllers/messageController.js";
import { onlineUsers } from "../controllers/onlineController.js";

const router = express.Router();

router.post("/send", requireAuth, sendMessage);
router.get("/conversation/:userId", requireAuth, getConversation);
router.put("/seen/:messageId", requireAuth, markSeen);
router.post("/heartbeat", requireAuth, heartbeat);
router.get("/online-users", requireAuth, onlineUsers);

export default router;
