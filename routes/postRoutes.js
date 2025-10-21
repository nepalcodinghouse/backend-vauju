import express from "express";
import { 
  createPost, 
  getPosts, 
  getPost, 
  updatePost, 
  deletePost, 
  likePost, 
  unlikePost, 
  addComment, 
  deleteComment 
} from "../controllers/postController.js";
import { auth } from "../middleware/auth.js";

const router = express.Router();

// Public routes
router.get("/", getPosts); // Get all posts (feed)

// Protected routes
router.use(auth); // Apply auth middleware to all routes below

router.post("/", createPost); // Create a new post
router.get("/:id", getPost); // Get specific post
router.put("/:id", updatePost); // Update post (only by author)
router.delete("/:id", deletePost); // Delete post (only by author)

// Like/Unlike routes
router.post("/:id/like", likePost); // Like a post
router.delete("/:id/like", unlikePost); // Unlike a post

// Comment routes
router.post("/:id/comments", addComment); // Add comment to post
router.delete("/:postId/comments/:commentId", deleteComment); // Delete comment

export default router;
