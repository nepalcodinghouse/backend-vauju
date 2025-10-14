import express from "express";
import { requireAdmin, approveVisibility } from "../controllers/adminController.js";

const router = express.Router();

// Admin-only approval endpoint for matches visibility
router.post("/approve/:userId", requireAdmin, approveVisibility);

export default router;


