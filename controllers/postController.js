import Post from "../models/Post.js";
import User from "../models/User.js";
import mongoose from "mongoose";

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
    const { content } = req.body;

    // Check if user has permission to post
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(403).json({ message: "You don't have permission to create posts" });
    }

    const allowedEmail = "abhayabikramshahiofficial@gmail.com";
    if (!user.email || user.email.toLowerCase() !== allowedEmail) {
      return res.status(403).json({ message: "Posting is restricted to approved accounts" });
    }

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ message: "Post content is required" });
    }

    if (content.length > 500) {
      return res.status(400).json({ message: "Post content cannot exceed 500 characters" });
    }

    const post = new Post({
      user: req.user._id,
      content: content.trim()
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
    const { content } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid post ID" });
    }

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ message: "Post content is required" });
    }

    if (content.length > 500) {
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

    post.content = content.trim();
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

// Like a post
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

    // Check if already liked
    const alreadyLiked = post.likes.some(like => String(like) === String(req.user._id));

    if (alreadyLiked) {
      return res.status(400).json({ message: "Post already liked" });
    }

    post.likes.push(req.user._id);
    await post.save();

    await post.populate('user', 'name username profileImage isBlueTick');

    res.json({ message: "Post liked successfully", likesCount: post.likesCount });
  } catch (error) {
    console.error("Like post error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Unlike a post
export const unlikePost = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid post ID" });
    }

    const post = await Post.findOne({ _id: id, isDeleted: false });

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Check if not liked
    const likeIndex = post.likes.findIndex(like => String(like) === String(req.user._id));

    if (likeIndex === -1) {
      return res.status(400).json({ message: "Post not liked yet" });
    }

    post.likes.splice(likeIndex, 1);
    await post.save();

    await post.populate('user', 'name username profileImage isBlueTick');

    res.json({ message: "Post unliked successfully", likesCount: post.likesCount });
  } catch (error) {
    console.error("Unlike post error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Add comment to post
export const addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid post ID" });
    }

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ message: "Comment content is required" });
    }

    if (content.trim().length > 250) {
      return res.status(400).json({ message: "Comment cannot exceed 250 characters" });
    }

    const post = await Post.findOne({ _id: id, isDeleted: false });

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const alreadyCommented = post.comments.some(
      (comment) => String(comment.user) === String(req.user._id)
    );

    if (alreadyCommented) {
      return res.status(400).json({ message: "You have already commented on this post" });
    }

    const comment = {
      user: req.user._id,
      content: content.trim(),
      createdAt: new Date()
    };

    post.comments.push(comment);
    await post.save();

    await post.populate('comments.user', 'name username profileImage');

    const newComment = post.comments[post.comments.length - 1];

    res.status(201).json({
      comment: {
        _id: newComment._id,
        content: newComment.content,
        createdAt: newComment.createdAt,
        user: newComment.user
      },
      commentsCount: post.commentsCount
    });
  } catch (error) {
    console.error("Add comment error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Delete comment
export const deleteComment = async (req, res) => {
  try {
    const { postId, commentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(postId) || !mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({ message: "Invalid post or comment ID" });
    }

    const post = await Post.findOne({ _id: postId, isDeleted: false });

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const comment = post.comments.id(commentId);

    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    // Check if user is the comment author or post author
    if (String(comment.user) !== String(req.user._id) && String(post.user) !== String(req.user._id)) {
      return res.status(403).json({ message: "You can only delete your own comments or comments on your posts" });
    }

    comment.remove();
    await post.save();

    res.json({ message: "Comment deleted successfully", commentsCount: post.commentsCount });
  } catch (error) {
    console.error("Delete comment error:", error);
    res.status(500).json({ message: error.message });
  }
};
