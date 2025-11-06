import express from 'express';
import { requireAuth } from '../server.js';
import Post from '../models/Post.js';
import User from '../models/User.js';

const router = express.Router();

// Get all posts with pagination
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const posts = await Post.find()
      .populate('user', 'name username profilePic gender')
      .populate('likes.user', 'name username profilePic gender')
      .populate('comments.user', 'name username profilePic gender')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Post.countDocuments();
    
    res.json({
      posts,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get a single post by ID
router.get('/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('user', 'name username profilePic gender')
      .populate('likes.user', 'name username profilePic gender')
      .populate('comments.user', 'name username profilePic gender');

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    res.json(post);
  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new post
router.post('/', requireAuth, async (req, res) => {
  try {
    const { title, content, image } = req.body;
    
    // Validate required fields
    if (!content) {
      return res.status(400).json({ message: 'Content is required' });
    }

    const post = new Post({
      title,
      content,
      image,
      user: req.user._id
    });

    const savedPost = await post.save();
    
    // Populate the user field
    await savedPost.populate('user', 'name username profilePic gender');
    
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

    // Check if user has already liked the post
    const alreadyLiked = post.likes.some(like => 
      like.user && like.user.toString() === req.user._id.toString()
    );

    if (alreadyLiked) {
      // Unlike the post
      post.likes = post.likes.filter(like => 
        !(like.user && like.user.toString() === req.user._id.toString())
      );
    } else {
      // Like the post
      post.likes.push({ user: req.user._id });
    }

    await post.save();
    
    // Populate the likes with user data
    await post.populate('likes.user', 'name username profilePic gender');
    
    res.json(post);
  } catch (error) {
    console.error('Like post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add a comment to a post
router.post('/:id/comments', requireAuth, async (req, res) => {
  try {
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({ message: 'Comment content is required' });
    }

    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const comment = {
      user: req.user._id,
      text: content.trim()
    };

    post.comments.push(comment);
    await post.save();
    
    // Populate the comment user data
    await post.populate('comments.user', 'name username profilePic gender');
    
    // Find the added comment
    const addedComment = post.comments[post.comments.length - 1];
    
    // Return the full post object to ensure consistency
    res.status(201).json({
      comment: addedComment,
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

    // Check if user has already shared the post
    const alreadyShared = post.shares.some(share => 
      share.user && share.user.toString() === req.user._id.toString()
    );

    if (!alreadyShared) {
      post.shares.push({ user: req.user._id });
      await post.save();
    }

    res.json({ message: 'Post shared successfully' });
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
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;