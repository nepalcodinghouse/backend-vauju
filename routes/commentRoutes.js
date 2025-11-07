import express from 'express';
import { auth as requireAuth } from '../middleware/auth.js';
import Comment from '../models/Comment.js';
import Post from '../models/Post.js';

const router = express.Router();

// Get all comments for a post
router.get('/post/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    
    const comments = await Comment.find({ post: postId })
      .populate('user', 'name username profilePic gender verified')
      .populate('replies.user', 'name username profilePic gender verified')
      .populate('likes.user', 'name username profilePic gender')
      .sort({ createdAt: -1 });

    res.json({
      comments,
      total: comments.length
    });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get a single comment by ID
router.get('/:commentId', async (req, res) => {
  try {
    const { commentId } = req.params;
    
    const comment = await Comment.findById(commentId)
      .populate('user', 'name username profilePic gender verified')
      .populate('replies.user', 'name username profilePic gender verified')
      .populate('likes.user', 'name username profilePic gender');

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    res.json(comment);
  } catch (error) {
    console.error('Get comment error:', error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ message: 'Invalid comment ID format' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new comment on a post
router.post('/post/:postId', requireAuth, async (req, res) => {
  try {
    const { postId } = req.params;
    const { content } = req.body;

    // Validate content
    const trimmedContent = (content || '').trim();
    if (!trimmedContent) {
      return res.status(400).json({ message: 'Comment content is required' });
    }

    // Check if post exists
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Create the comment
    const comment = new Comment({
      post: postId,
      user: req.user._id,
      content: trimmedContent
    });

    const savedComment = await comment.save();
    
    // Populate user data
    await savedComment.populate('user', 'name username profilePic gender verified');

    // Add comment to post's comments array
    post.comments.push(savedComment._id);
    await post.save();

    res.status(201).json({
      comment: savedComment,
      commentsCount: post.comments.length
    });
  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update a comment (only by the owner)
router.put('/:commentId', requireAuth, async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;

    // Validate content
    const trimmedContent = (content || '').trim();
    if (!trimmedContent) {
      return res.status(400).json({ message: 'Comment content is required' });
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Check if user is the owner
    if (comment.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this comment' });
    }

    comment.content = trimmedContent;
    await comment.save();

    await comment.populate('user', 'name username profilePic gender verified');

    res.json({
      message: 'Comment updated successfully',
      comment
    });
  } catch (error) {
    console.error('Update comment error:', error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ message: 'Invalid comment ID format' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a comment (only by the owner)
router.delete('/:commentId', requireAuth, async (req, res) => {
  try {
    const { commentId } = req.params;

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Check if user is the owner
    if (comment.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this comment' });
    }

    // Remove comment from post's comments array
    const post = await Post.findById(comment.post);
    if (post) {
      post.comments = post.comments.filter(c => c.toString() !== commentId);
      await post.save();
    }

    await Comment.findByIdAndDelete(commentId);

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Delete comment error:', error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ message: 'Invalid comment ID format' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// Like a comment
router.post('/:commentId/like', requireAuth, async (req, res) => {
  try {
    const { commentId } = req.params;

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    const userId = req.user._id.toString();
    const likeIndex = comment.likes.findIndex(like => 
      like.user && like.user.toString() === userId
    );

    if (likeIndex > -1) {
      // Unlike the comment
      comment.likes.splice(likeIndex, 1);
    } else {
      // Like the comment
      comment.likes.push({ user: req.user._id });
    }

    await comment.save();
    await comment.populate('likes.user', 'name username profilePic gender');

    res.json({
      message: likeIndex > -1 ? 'Comment unliked' : 'Comment liked',
      comment,
      likesCount: comment.likes.length
    });
  } catch (error) {
    console.error('Like comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reply to a comment
router.post('/:commentId/reply', requireAuth, async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;

    // Validate content
    const trimmedContent = (content || '').trim();
    if (!trimmedContent) {
      return res.status(400).json({ message: 'Reply content is required' });
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    const reply = {
      user: req.user._id,
      content: trimmedContent
    };

    comment.replies.push(reply);
    await comment.save();

    await comment.populate('replies.user', 'name username profilePic gender verified');

    // Get the added reply (last one)
    const addedReply = comment.replies[comment.replies.length - 1];

    res.status(201).json({
      reply: addedReply,
      repliesCount: comment.replies.length
    });
  } catch (error) {
    console.error('Add reply error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a reply (only by the owner)
router.delete('/:commentId/reply/:replyId', requireAuth, async (req, res) => {
  try {
    const { commentId, replyId } = req.params;

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    const reply = comment.replies.id(replyId);
    if (!reply) {
      return res.status(404).json({ message: 'Reply not found' });
    }

    // Check if user is the owner
    if (reply.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this reply' });
    }

    comment.replies.pull(replyId);
    await comment.save();

    res.json({ message: 'Reply deleted successfully' });
  } catch (error) {
    console.error('Delete reply error:', error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ message: 'Invalid ID format' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
