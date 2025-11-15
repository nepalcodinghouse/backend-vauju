import Post from "../models/Post.js";

// Middleware to track post views
export const trackPostView = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return next();
    }
    
    // Get post
    const post = await Post.findById(id);
    
    if (!post) {
      return next();
    }
    
    // Get user info if available
    const userId = req.user ? req.user._id : null;
    
    // Get IP and user agent
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || '';
    
    // Check if this is a unique viewer (if user is logged in)
    let isUniqueViewer = true;
    if (userId) {
      isUniqueViewer = !post.uniqueViewers.some(viewer => 
        viewer.toString() === userId.toString()
      );
    }
    
    // Update view count and tracking data
    post.viewCount += 1;
    
    // Add to unique viewers if applicable
    if (userId && isUniqueViewer) {
      post.uniqueViewers.push(userId);
    }
    
    // Add to view history
    post.viewHistory.push({
      user: userId,
      viewedAt: new Date(),
      ip: ip,
      userAgent: userAgent
    });
    
    // Save the post
    await post.save();
    
    next();
  } catch (error) {
    console.error("Error tracking post view:", error);
    // Don't block the request if tracking fails
    next();
  }
};