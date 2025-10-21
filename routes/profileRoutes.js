import express from "express";
import { getProfile, updateProfile, getMatches, getMessagesUsers, uploadProfilePicture } from "../controllers/profileController.js";
import { auth } from "../middleware/auth.js";
import multer from "multer";

const router = express.Router();

// Protected routes - using proper Bearer token auth
router.get("/", auth, getProfile);
router.put("/", auth, updateProfile);
router.get("/matches", auth, getMatches);
router.get("/messages-users", auth, getMessagesUsers);
router.get("/me", auth, getProfile); // Additional alias

// File upload setup
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Profile picture upload
router.post("/upload", auth, upload.single('profilePic'), uploadProfilePicture);

export default router;
