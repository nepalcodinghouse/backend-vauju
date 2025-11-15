import express from 'express';
import { auth as requireAuth } from '../middleware/auth.js';
import { trackPostView } from '../middleware/viewTracker.js';
import Post from '../models/Post.js';
import Comment from '../models/Comment.js';
import User from '../models/User.js';

const router = express.Router();

// Get all posts with pagination
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10)); // Cap at 100
    const skip = (page - 1) * limit;

    console.log(`Fetching posts - Page: ${page}, Limit: ${limit}, Skip: ${skip}`);

    const posts = await Post.find()
      .populate('user', 'name username profilePic gender verified')
      .populate('likes.user', 'name username profilePic gender')
      .populate({
        path: 'comments',
        populate: { path: 'user', select: 'name username profilePic gender verified' }
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Post.countDocuments();
    
    console.log(`Found ${posts.length} posts out of ${total} total`);
    
    res.json({
      posts,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get posts error:', error.message, error.stack);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get a single post by ID
router.get('/:id', trackPostView, async (req, res) => {
  try {
    console.log(`Fetching post with ID: ${req.params.id}`);
    
    const post = await Post.findById(req.params.id)
      .populate('user', 'name username profilePic gender verified')
      .populate('likes.user', 'name username profilePic gender')
      .populate({
        path: 'comments',
        populate: { path: 'user', select: 'name username profilePic gender verified' }
      });

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    res.json(post);
  } catch (error) {
    console.error('Get post error:', error.message, error.stack);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ message: 'Invalid post ID format' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create a new post
router.post('/', requireAuth, async (req, res) => {
  try {
    const { title, content, image } = req.body;
    
    // Validate required fields
    const trimmedContent = content ? content.trim() : '';
    if (!trimmedContent) {
      return res.status(400).json({ message: 'Content is required' });
    }

    const post = new Post({
      title: title ? title.trim() : undefined,
      content: trimmedContent,
      image,
      user: req.user._id
    });

    const savedPost = await post.save();
    
    // Populate the user field with verified status
    await savedPost.populate('user', 'name username profilePic gender verified');
    
    res.status(201).json(savedPost);
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Like a post
router.post('/:id/like', requireAuth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const userId = req.user._id.toString();
    const likeIndex = post.likes.findIndex(like => 
      like.user && like.user.toString() === userId
    );

    if (likeIndex > -1) {
      // Unlike the post - remove from array
      post.likes.splice(likeIndex, 1);
    } else {
      // Like the post - add to array
      post.likes.push({ user: req.user._id });
    }

    await post.save();
    
    // Populate the likes with user data
    await post.populate('likes.user', 'name username profilePic gender');
    
    res.json({
      message: likeIndex > -1 ? 'Post unliked' : 'Post liked',
      post,
      likesCount: post.likes.length
    });
  } catch (error) {
    console.error('Like post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add a comment to a post
router.post('/:id/comments', requireAuth, async (req, res) => {
  try {
    const { content, text } = req.body;
    const commentText = (content || text || '').trim();
    
    if (!commentText) {
      return res.status(400).json({ message: 'Comment content is required' });
    }

    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Create comment in Comment collection
    const comment = new Comment({
      post: req.params.id,
      user: req.user._id,
      content: commentText
    });

    const savedComment = await comment.save();
    
    // Populate user data
    await savedComment.populate('user', 'name username profilePic gender verified');
    
    // Add comment ID to post's comments array
    post.comments.push(savedComment._id);
    await post.save();
    
    // Return the comment with proper format
    res.status(201).json({
      comment: savedComment,
      commentsCount: post.comments.length
    });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Share a post
router.post('/:id/share', requireAuth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const userId = req.user._id.toString();
    const shareIndex = post.shares.findIndex(share => 
      share.user && share.user.toString() === userId
    );

    if (shareIndex === -1) {
      // Add share if not already shared
      post.shares.push({ user: req.user._id });
      await post.save();
    }

    res.json({ 
      message: 'Post shared successfully',
      sharesCount: post.shares.length
    });
  } catch (error) {
    console.error('Share post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a post (only by the owner)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Check if the user is the owner of the post
    if (post.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this post' });
    }

    await Post.findByIdAndDelete(req.params.id);
    res.json({ message: 'Post deleted successfully', postId: req.params.id });
  } catch (error) {
    console.error('Delete post error:', error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ message: 'Invalid post ID format' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// Get post view analytics
router.get('/:id/analytics/views', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: 'Post ID is required' });
    }

    const post = await Post.findById(id)
      .populate('user', 'name username profileImage');

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Check if user is the author of the post
    if (post.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to view analytics for this post' });
    }

    // Get unique viewers count
    const uniqueViewersCount = post.uniqueViewers.length;

    // Get view history grouped by date
    const viewHistory = post.viewHistory || [];
    
    // Group views by date for chart data
    const viewsByDate = {};
    viewHistory.forEach(view => {
      const date = view.viewedAt.toISOString().split('T')[0];
      if (!viewsByDate[date]) {
        viewsByDate[date] = 0;
      }
      viewsByDate[date]++;
    });

    // Get top viewers (users with most views)
    const viewerCounts = {};
    viewHistory.forEach(view => {
      if (view.user) {
        const userId = view.user.toString();
        if (!viewerCounts[userId]) {
          viewerCounts[userId] = {
            count: 0,
            user: view.user
          };
        }
        viewerCounts[userId].count++;
      }
    });

    // Convert to array and sort by count
    const topViewers = Object.values(viewerCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    res.status(200).json({
      success: true,
      analytics: {
        postId: post._id,
        title: post.title || "Untitled",
        content: post.content.substring(0, 100) + (post.content.length > 100 ? "..." : ""),
        author: post.user.name,
        createdAt: post.createdAt,
        viewStats: {
          totalViews: post.viewCount || 0,
          uniqueViewers: uniqueViewersCount,
          repeatViewers: (post.viewCount || 0) - uniqueViewersCount,
          viewsByDate: viewsByDate
        },
        topViewers: topViewers
      }
    });
  } catch (error) {
    console.error('Get post view analytics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get detailed view history for a post
router.get('/:id/history/views', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;

    if (!id) {
      return res.status(400).json({ message: 'Post ID is required' });
    }

    const post = await Post.findById(id)
      .populate('viewHistory.user', 'name username profileImage');

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Check if user is the author of the post
    if (post.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to view history for this post' });
    }

    const viewHistory = post.viewHistory || [];
    const totalViews = viewHistory.length;
    
    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    
    const paginatedViews = viewHistory
      .sort((a, b) => new Date(b.viewedAt) - new Date(a.viewedAt))
      .slice(startIndex, endIndex);

    res.status(200).json({
      success: true,
      postId: post._id,
      viewHistory: paginatedViews,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalViews / limitNum),
        totalViews: totalViews,
        hasNext: endIndex < totalViews,
        hasPrev: startIndex > 0
      }
    });
  } catch (error) {
    console.error('Get post view history error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's post view analytics
router.get('/user/:userId/analytics/views', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    // Check if user is requesting their own analytics or is admin
    if (userId !== req.user._id.toString()) {
      // Check if user is admin
      const user = await User.findById(req.user._id);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ message: 'Not authorized to view analytics for this user' });
      }
    }

    // Get all posts by user
    const posts = await Post.find({ user: userId })
      .sort({ createdAt: -1 });

    if (posts.length === 0) {
      return res.status(200).json({
        success: true,
        userId: userId,
        totalPosts: 0,
        viewAnalytics: {
          totalViews: 0,
          totalUniqueViewers: 0,
          averageViewsPerPost: 0,
          mostViewedPost: null
        },
        posts: []
      });
    }

    // Calculate view statistics
    let totalViews = 0;
    let totalUniqueViewers = 0;
    let mostViewedPost = null;
    let maxViews = 0;

    const postsWithViews = await Promise.all(
      posts.map(async (post) => {
        const views = post.viewCount || 0;
        const uniqueViewers = post.uniqueViewers.length;
        
        totalViews += views;
        totalUniqueViewers += uniqueViewers;
        
        if (views > maxViews) {
          maxViews = views;
          mostViewedPost = {
            postId: post._id,
            title: post.title || "Untitled",
            views: views,
            uniqueViewers: uniqueViewers
          };
        }

        return {
          postId: post._id,
          title: post.title || "Untitled",
          content: post.content.substring(0, 80) + (post.content.length > 80 ? "..." : ""),
          createdAt: post.createdAt,
          views: views,
          uniqueViewers: uniqueViewers
        };
      })
    );

    const averageViewsPerPost = Math.round(totalViews / posts.length);

    res.status(200).json({
      success: true,
      userId: userId,
      totalPosts: posts.length,
      viewAnalytics: {
        totalViews: totalViews,
        totalUniqueViewers: totalUniqueViewers,
        averageViewsPerPost: averageViewsPerPost,
        mostViewedPost: mostViewedPost
      },
      posts: postsWithViews
    });
  } catch (error) {
    console.error('Get user post view analytics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;