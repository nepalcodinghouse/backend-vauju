import Post from "../models/Post.js";
import User from "../models/User.js";
import Share from "../models/Share.js";
import mongoose from "mongoose";
import { sanitize } from "sanitizer";

// Get all posts (feed)
export const getPosts = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '10', 10), 1), 50);
    const skip = (page - 1) * limit;

    const posts = await Post.find({ isDeleted: false })
      .populate('user', 'name username profileImage isBlueTick')
      .populate('comments.user', 'name username profileImage')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalPosts = await Post.countDocuments({ isDeleted: false });
    const hasMore = skip + limit < totalPosts;

    res.json({
      posts,
      pagination: {
        page,
        limit,
        totalPosts,
        hasMore
      }
    });
  } catch (error) {
    console.error("Get posts error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Get posts by specific user
export const getPostsByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '10', 10), 1), 50);
    const skip = (page - 1) * limit;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    // Check if user exists
    const userExists = await User.findById(userId);
    if (!userExists) {
      return res.status(404).json({ message: "User not found" });
    }

    const posts = await Post.find({ user: userId, isDeleted: false })
      .populate('user', 'name username profileImage isBlueTick')
      .populate('comments.user', 'name username profileImage')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalPosts = await Post.countDocuments({ user: userId, isDeleted: false });
    const hasMore = skip + limit < totalPosts;

    res.json({
      posts,
      pagination: {
        page,
        limit,
        totalPosts,
        hasMore
      }
    });
  } catch (error) {
    console.error("Get user posts error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Get specific post
export const getPost = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid post ID" });
    }

    const post = await Post.findOne({ _id: id, isDeleted: false })
      .populate('user', 'name username profileImage isBlueTick')
      .populate('comments.user', 'name username profileImage');

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    res.json(post);
  } catch (error) {
    console.error("Get post error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Create new post
export const createPost = async (req, res) => {
  try {
    // Sanitize input data
    const { content } = req.body;
    const sanitizedContent = sanitize(content);

    // Check if user exists
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(403).json({ message: "User not found" });
    }

    if (!sanitizedContent || sanitizedContent.trim().length === 0) {
      return res.status(400).json({ message: "Post content is required" });
    }

    if (sanitizedContent.length > 500) {
      return res.status(400).json({ message: "Post content cannot exceed 500 characters" });
    }

    const post = new Post({
      user: req.user._id,
      content: sanitizedContent.trim()
    });

    await post.save();

    // Populate user data before sending response
    await post.populate('user', 'name username profileImage isBlueTick');

    res.status(201).json(post);
  } catch (error) {
    console.error("Create post error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Update post (only by author)
export const updatePost = async (req, res) => {
  try {
    const { id } = req.params;
    // Sanitize input data
    const { content } = req.body;
    const sanitizedContent = sanitize(content);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid post ID" });
    }

    if (!sanitizedContent || sanitizedContent.trim().length === 0) {
      return res.status(400).json({ message: "Post content is required" });
    }

    if (sanitizedContent.length > 500) {
      return res.status(400).json({ message: "Post content cannot exceed 500 characters" });
    }

    const post = await Post.findOne({ _id: id, isDeleted: false });

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Check if user is the author
    if (String(post.user) !== String(req.user._id)) {
      return res.status(403).json({ message: "You can only edit your own posts" });
    }

    post.content = sanitizedContent.trim();
    await post.save();

    await post.populate('user', 'name username profileImage isBlueTick');

    res.json(post);
  } catch (error) {
    console.error("Update post error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Delete post (only by author)
export const deletePost = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid post ID" });
    }

    const post = await Post.findOne({ _id: id, isDeleted: false });

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Check if user is the author
    if (String(post.user) !== String(req.user._id)) {
      return res.status(403).json({ message: "You can only delete your own posts" });
    }

    // Soft delete
    post.isDeleted = true;
    await post.save();

    res.json({ message: "Post deleted successfully" });
  } catch (error) {
    console.error("Delete post error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Like post
export const likePost = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid post ID" });
    }

    const post = await Post.findOne({ _id: id, isDeleted: false });

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Check if user has already liked the post
    const existingLike = post.likes.find(like => String(like.user) === String(req.user._id));

    if (existingLike) {
      // Unlike the post
      post.likes = post.likes.filter(like => String(like.user) !== String(req.user._id));
    } else {
      // Like the post
      post.likes.push({ user: req.user._id });
    }

    await post.save();

    // Populate user data before sending response
    await post.populate('user', 'name username profileImage isBlueTick');
    await post.populate('likes.user', 'name username profileImage');

    res.json(post);
  } catch (error) {
    console.error("Like post error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Add comment to post
export const addComment = async (req, res) => {
  try {
    const { id } = req.params;
    // Sanitize input data
    const { content } = req.body;
    const sanitizedContent = sanitize(content);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid post ID" });
    }

    if (!sanitizedContent || sanitizedContent.trim().length === 0) {
      return res.status(400).json({ message: "Comment content is required" });
    }

    if (sanitizedContent.length > 300) {
      return res.status(400).json({ message: "Comment content cannot exceed 300 characters" });
    }

    const post = await Post.findOne({ _id: id, isDeleted: false });

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Create comment (in a real app, you would create a Comment document)
    const comment = {
      user: req.user._id,
      content: sanitizedContent.trim(),
      createdAt: new Date()
    };

    post.comments.push(comment);
    await post.save();

    // Populate user data before sending response
    await post.populate('user', 'name username profileImage isBlueTick');
    await post.populate('comments.user', 'name username profileImage');

    res.status(201).json(post);
  } catch (error) {
    console.error("Add comment error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Delete comment
export const deleteComment = async (req, res) => {
  try {
    const { id, commentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid post ID" });
    }

    const post = await Post.findOne({ _id: id, isDeleted: false });

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Find the comment
    const commentIndex = post.comments.findIndex(comment => 
      String(comment._id) === commentId && 
      (String(comment.user) === String(req.user._id) || String(post.user) === String(req.user._id))
    );

    if (commentIndex === -1) {
      return res.status(404).json({ message: "Comment not found or you don't have permission to delete it" });
    }

    // Remove the comment
    post.comments.splice(commentIndex, 1);
    await post.save();

    // Populate user data before sending response
    await post.populate('user', 'name username profileImage isBlueTick');
    await post.populate('comments.user', 'name username profileImage');

    res.json(post);
  } catch (error) {
    console.error("Delete comment error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Share post
export const sharePost = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid post ID" });
    }

    const post = await Post.findOne({ _id: id, isDeleted: false });

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Check if user has already shared the post
    const existingShare = post.shares.find(share => String(share.user) === String(req.user._id));

    if (existingShare) {
      return res.status(400).json({ message: "You have already shared this post" });
    }

    // Add share
    post.shares.push({ user: req.user._id });
    await post.save();

    // Also create a share document
    const share = new Share({
      user: req.user._id,
      post: id
    });
    await share.save();

    // Populate user data before sending response
    await post.populate('user', 'name username profileImage isBlueTick');

    res.json({ message: "Post shared successfully", post });
  } catch (error) {
    console.error("Share post error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Get post analytics (view count, etc.)
export const getPostAnalytics = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid post ID" });
    }

    // Check if user is the author of the post
    const post = await Post.findOne({ _id: id, user: req.user._id, isDeleted: false });

    if (!post) {
      return res.status(404).json({ message: "Post not found or you don't have permission to view analytics" });
    }

    // Get analytics data
    const analytics = {
      viewCount: post.viewCount,
      uniqueViewers: post.uniqueViewers.length,
      shares: post.shares.length,
      likes: post.likes.length,
      comments: post.comments.length
    };

    res.json(analytics);
  } catch (error) {
    console.error("Get post analytics error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Track post view
export const trackPostView = async (req, res) => {
  try {
    const { id } = req.params;
    const { ip, userAgent } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid post ID" });
    }

    const post = await Post.findOne({ _id: id, isDeleted: false });

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Increment view count
    post.viewCount += 1;

    // Add to unique viewers if not already viewed
    if (!post.uniqueViewers.includes(req.user._id)) {
      post.uniqueViewers.push(req.user._id);
    }

    // Add to view history
    post.viewHistory.push({
      user: req.user._id,
      ip: sanitize(ip),
      userAgent: sanitize(userAgent)
    });

    await post.save();

    res.json({ message: "View tracked successfully" });
  } catch (error) {
    console.error("Track post view error:", error);
    res.status(500).json({ message: error.message });
  }
};
