import Post from "../models/Post.js";
import User from "../models/User.js";
import Share from "../models/Share.js";
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

    // Check if user exists
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(403).json({ message: "User not found" });
    }

    // Check if user has permission to post
    // Users with blue tick or canPost flag can post
    // Additionally, specific professional users can post
    const professionalUsers = ['abhayabikramshahioffciial@gmail.com', 'anupama57@gmail.com', "aurameetofficial@gmail.com"];
    const hasPermission = user.isBlueTick || 
                         user.canPost || 
                         professionalUsers.includes(user.email);

    if (!hasPermission) {
      return res.status(403).json({ message: "You don't have permission to create posts" });
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

// ... existing code ...

// Record post share
export const sharePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { sharedAt } = req.body;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid post ID" });
    }

    // Verify post exists
    const post = await Post.findOne({ _id: id, isDeleted: false });
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Create share record
    const share = new Share({
      postId: id,
      userId: userId,
      sharedAt: new Date(sharedAt || Date.now())
    });

    await share.save();

    // Update post share count
    post.shareCount = (post.shareCount || 0) + 1;
    await post.save();

    res.status(200).json({
      success: true,
      message: "Share recorded successfully",
      share: share
    });
  } catch (error) {
    console.error("Share post error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Get post shares analytics
export const getPostShares = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid post ID" });
    }

    const post = await Post.findOne({ _id: id, isDeleted: false });
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const shares = await Share.find({ postId: id })
      .populate('userId', 'name username profileImage')
      .sort({ sharedAt: -1 });

    res.status(200).json({
      success: true,
      totalShares: shares.length,
      shares: shares
    });
  } catch (error) {
    console.error("Get post shares error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Get post analytics (combined stats)
export const getPostAnalytics = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid post ID" });
    }

    const post = await Post.findOne({ _id: id, isDeleted: false })
      .populate('user', 'name username profileImage');

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const shares = await Share.countDocuments({ postId: id });
    const comments = post.comments.length;
    const likes = post.likes.length;

    res.status(200).json({
      success: true,
      analytics: {
        postId: post._id,
        title: post.title || "Untitled",
        content: post.content.substring(0, 100) + (post.content.length > 100 ? "..." : ""),
        author: post.user.name,
        createdAt: post.createdAt,
        stats: {
          likes: likes,
          comments: comments,
          shares: shares,
          totalEngagement: likes + comments + shares
        },
        engagement: {
          likeRate: likes > 0 ? Math.round((likes / (likes + comments + shares)) * 100) : 0,
          commentRate: comments > 0 ? Math.round((comments / (likes + comments + shares)) * 100) : 0,
          shareRate: shares > 0 ? Math.round((shares / (likes + comments + shares)) * 100) : 0
        }
      }
    });
  } catch (error) {
    console.error("Get post analytics error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Get user analytics
export const getUserPostAnalytics = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const posts = await Post.find({ user: userId, isDeleted: false })
      .populate('user', 'name username profileImage');

    if (posts.length === 0) {
      return res.status(200).json({
        success: true,
        userId: userId,
        totalPosts: 0,
        analytics: {
          totalLikes: 0,
          totalComments: 0,
          totalShares: 0,
          averageEngagement: 0
        },
        posts: []
      });
    }

    let totalLikes = 0;
    let totalComments = 0;
    let totalShares = 0;

    const postsAnalytics = await Promise.all(
      posts.map(async (post) => {
        const shares = await Share.countDocuments({ postId: post._id });
        const likes = post.likes.length;
        const comments = post.comments.length;

        totalLikes += likes;
        totalComments += comments;
        totalShares += shares;

        return {
          postId: post._id,
          content: post.content.substring(0, 80) + (post.content.length > 80 ? "..." : ""),
          createdAt: post.createdAt,
          stats: {
            likes: likes,
            comments: comments,
            shares: shares,
            totalEngagement: likes + comments + shares
          }
        };
      })
    );

    const averageEngagement = Math.round(
      (totalLikes + totalComments + totalShares) / posts.length
    );

    res.status(200).json({
      success: true,
      userId: userId,
      totalPosts: posts.length,
      analytics: {
        totalLikes: totalLikes,
        totalComments: totalComments,
        totalShares: totalShares,
        averageEngagement: averageEngagement
      },
      posts: postsAnalytics
    });
  } catch (error) {
    console.error("Get user analytics error:", error);
    res.status(500).json({ message: error.message });
  }
};

// ... existing code ...

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
