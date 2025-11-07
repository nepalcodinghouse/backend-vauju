import express from 'express';
import { auth as requireAuth } from '../middleware/auth.js';
import Post from '../models/Post.js';
import Comment from '../models/Comment.js';

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
router.get('/:id', async (req, res) => {
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

export default router;