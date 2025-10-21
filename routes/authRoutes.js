import express from "express";
import { registerUser, loginUser, getMe, getUserProfile } from "../controllers/authController.js";
import { auth } from "../middleware/auth.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/me", auth, getMe);
router.get("/user", auth, getUserProfile);
router.get("/user/me", auth, getUserProfile);

export default router;
