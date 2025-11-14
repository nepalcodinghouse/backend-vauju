// server.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import http from "http";
import { Server as IOServer } from "socket.io";
import jwt from "jsonwebtoken";
import connectDB from "./config/db.js";
import path from "path";
import { fileURLToPath } from "url";

// Get the directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, ".env") });

// Check if MONGODB_URI is defined
if (!process.env.MONGODB_URI) {
  console.error("FATAL ERROR: MONGODB_URI is not defined in environment variables");
  console.error("Current working directory:", process.cwd());
  console.error("Expected .env file path:", path.resolve(__dirname, ".env"));
  console.error("Environment variables:", Object.keys(process.env));
  process.exit(1);
}

// If JWT_SECRET is not set, log an error and exit
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error("FATAL ERROR: JWT_SECRET is not defined in environment variables");
  console.error("Current working directory:", process.cwd());
  console.error("Expected .env file path:", path.resolve(__dirname, ".env"));
  console.error("Environment variables:", Object.keys(process.env));
  process.exit(1);
}

// Import Models
import User from "./models/User.js";
import Post from "./models/Post.js";
import Comment from "./models/Comment.js";
import Notification from "./models/Notification.js";

connectDB();

const app = express();

// CORS Configuration
const allowedOrigins = [
  "http://localhost:5173",
  "https://vauju-dating-app.vercel.app",
  "https://www.yugalmeet.com",
  "https://admin.yugalmeet.com",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("CORS policy: Origin not allowed"), false);
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-user-id"],
  })
);

// REMOVE THIS LINE:
// app.options("*", cors());  // THIS CAUSES CRASH

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve static files for local uploads
app.use("/uploads", express.static("uploads"));

// =====================
// Auth Middleware
// =====================
export const requireAuth = (req, res, next) => {
  // Try to get token from Authorization header (standard Bearer token format)
  let token = null;
  
  // Check Authorization header first (standard format)
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }
  // Fallback to x-user-id header for backwards compatibility with frontend
  else if (req.headers["x-user-id"]) {
    token = req.headers["x-user-id"];
  }
  
  if (!token) return res.status(401).json({ message: "No token provided" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

// =====================
// Routes
// =====================

app.get("/api", (req, res) => {
  res.json({ status: "AuraMeet API is running perfectly!" });
});

app.get("/api/random-girl", async (req, res) => {
  try {
    const randomGirl = await User.aggregate([
      { $match: { gender: "female", suspended: { $ne: true } } },
      { $sample: { size: 1 } },
      {
        $project: {
          name: 1,
          age: 1,
          location: 1,
          profilePic: 1,
          username: 1,
          number: 1,
          bio: 1,
          interests: 1,
        },
      },
    ]);

    if (!randomGirl.length) {
      return res.status(404).json({ message: "No female users found" });
    }

    res.json(randomGirl[0]);
  } catch (error) {
    console.error("Random girl error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/@:username", async (req, res) => {
  try {
    const { username } = req.params;
    if (!username) {
      return res.status(400).json({ message: "Username required" });
    }

    const user = await User.findOne({
      username: username.toLowerCase().trim(),
    }).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.suspended) {
      return res.status(403).json({ message: "This user is suspended" });
    }

    res.json(user);
  } catch (error) {
    console.error("Get user by username error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/posts/:postId", async (req, res) => {
  try {
    const { postId } = req.params;
    if (!postId) {
      return res.status(400).json({ message: "Post ID required" });
    }

    // Fetch the post by ID
    const post = await Post.findById(postId)
      .populate('user', 'name username profilePic gender')
      .populate({
        path: 'comments',
        populate: { path: 'user', select: 'name username profilePic gender' }
      });

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Render a simple HTML page with post information
    // In a production environment, you might want to serve a more sophisticated template
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>YugalMeet Post</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .post-container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); overflow: hidden; }
        .post-header { display: flex; align-items: center; padding: 16px; border-bottom: 1px solid #eee; }
        .avatar { width: 40px; height: 40px; border-radius: 50%; background: #ddd; margin-right: 12px; }
        .user-info h3 { margin: 0; font-size: 16px; font-weight: 600; }
        .user-info p { margin: 2px 0 0; font-size: 12px; color: #666; }
        .post-content { padding: 16px; }
        .post-title { font-size: 20px; font-weight: 700; margin: 0 0 12px; }
        .post-text { font-size: 16px; line-height: 1.5; color: #333; margin: 0 0 16px; }
        .post-image { width: 100%; max-height: 400px; object-fit: cover; }
        .post-actions { display: flex; padding: 12px 16px; border-top: 1px solid #eee; }
        .action-button { display: flex; align-items: center; margin-right: 20px; color: #666; font-size: 14px; }
        .action-button svg { margin-right: 6px; }
        .comments-section { padding: 16px; border-top: 1px solid #eee; }
        .comment { display: flex; margin-bottom: 16px; }
        .comment-avatar { width: 32px; height: 32px; border-radius: 50%; background: #ddd; margin-right: 10px; }
        .comment-content { flex: 1; }
        .comment-header { display: flex; justify-content: space-between; margin-bottom: 4px; }
        .comment-author { font-weight: 600; font-size: 14px; }
        .comment-time { font-size: 12px; color: #999; }
        .comment-text { font-size: 14px; color: #333; }
        .view-button { display: block; width: 80%; margin: 20px auto; padding: 12px; background: #ff0000; color: white; text-align: center; text-decoration: none; border-radius: 8px; font-weight: 600; }
      </style>
    </head>
    <body>
      <div class="post-container">
        <div class="post-header">
          <div class="avatar"></div>
          <div class="user-info">
            <h3>${post.user.name}</h3>
            <p>@${post.user.username}</p>
          </div>
        </div>
        <div class="post-content">
          <h2 class="post-title">${post.title || 'Untitled Post'}</h2>
          <p class="post-text">${post.content}</p>
          ${post.image ? `<img src="${post.image}" alt="Post image" class="post-image">` : ''}
        </div>
        <div class="post-actions">
          <div class="action-button">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
            ${post.likes?.length || 0} Likes
          </div>
          <div class="action-button">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            ${post.comments?.length || 0} Comments
          </div>
        </div>
        <div class="comments-section">
          <h3>Comments</h3>
          ${post.comments.map(comment => `
            <div class="comment">
              <div class="comment-avatar"></div>
              <div class="comment-content">
                <div class="comment-header">
                  <span class="comment-author">${comment.user.name}</span>
                  <span class="comment-time">${new Date(comment.createdAt).toLocaleDateString()}</span>
                </div>
                <p class="comment-text">${comment.content}</p>
              </div>
            </div>
          `).join('')}
        </div>
        <a href="https://www.yugalmeet.com" class="view-button">View on YugalMeet</a>
      </div>
    </body>
    </html>
    `;
    res.send(html);
  } catch (error) {
    console.error("Get post error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// =====================
// Friends API
// =====================
// Send friend request
app.post("/api/friends/request", requireAuth, async (req, res) => {
  try {
    const { userId } = req.body;
    const currentUserId = req.user._id;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // Check if user exists and is not suspended
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (user.suspended) {
      return res.status(403).json({ message: "This user is suspended" });
    }

    // Check if already friends
    const currentUser = await User.findById(currentUserId);
    if (currentUser.friends.includes(userId)) {
      return res.status(400).json({ message: "You are already friends with this user" });
    }

    // Check if friend request already sent
    if (user.friendRequests.includes(currentUserId)) {
      return res.status(400).json({ message: "Friend request already sent" });
    }

    // Add friend request
    await User.findByIdAndUpdate(userId, {
      $addToSet: { friendRequests: currentUserId }
    });

    res.json({ message: "Friend request sent successfully" });
  } catch (error) {
    console.error("Send friend request error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Accept friend request
app.post("/api/friends/accept", requireAuth, async (req, res) => {
  try {
    const { userId } = req.body;
    const currentUserId = req.user._id;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // Remove friend request
    await User.findByIdAndUpdate(currentUserId, {
      $pull: { friendRequests: userId }
    });

    // Add each other as friends
    await User.findByIdAndUpdate(currentUserId, {
      $addToSet: { friends: userId }
    });

    await User.findByIdAndUpdate(userId, {
      $addToSet: { friends: currentUserId }
    });

    // Emit socket event for real-time notification
    const io = req.app.locals.io;
    const userSockets = req.app.locals.userSockets;
    const recipientSockets = userSockets.get(userId);
    if (recipientSockets) {
      recipientSockets.forEach((sid) => {
        io.to(sid).emit("friendAccept", {
          from: currentUserId,
          message: `${currentUser.name} accepted your friend request`,
          timestamp: new Date(),
        });
      });
    }

    res.json({ message: "Friend request accepted successfully" });
  } catch (error) {
    console.error("Accept friend request error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Reject friend request
app.post("/api/friends/reject", requireAuth, async (req, res) => {
  try {
    const { userId } = req.body;
    const currentUserId = req.user._id;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // Remove friend request
    await User.findByIdAndUpdate(currentUserId, {
      $pull: { friendRequests: userId }
    });

    res.json({ message: "Friend request rejected successfully" });
  } catch (error) {
    console.error("Reject friend request error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Remove friend
app.post("/api/friends/remove", requireAuth, async (req, res) => {
  try {
    const { userId } = req.body;
    const currentUserId = req.user._id;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // Remove each other as friends
    await User.findByIdAndUpdate(currentUserId, {
      $pull: { friends: userId }
    });

    await User.findByIdAndUpdate(userId, {
      $pull: { friends: currentUserId }
    });

    res.json({ message: "Friend removed successfully" });
  } catch (error) {
    console.error("Remove friend error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get friends list
app.get("/api/friends", requireAuth, async (req, res) => {
  try {
    console.log("Fetching friends for user:", req.user._id);
    
    const currentUser = await User.findById(req.user._id)
      .populate("friends", "name username profileImage bio location interests isOnline")
      .populate("friendRequests", "name username profileImage bio location interests isOnline");

    if (!currentUser) {
      console.log("User not found:", req.user._id);
      return res.status(404).json({ message: "User not found" });
    }

    console.log("Found user:", currentUser._id, "Friends count:", currentUser.friends?.length, "Requests count:", currentUser.friendRequests?.length);

    res.json({
      friends: currentUser.friends || [],
      friendRequests: currentUser.friendRequests || []
    });
  } catch (error) {
    console.error("Get friends error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get daily random user suggestion
app.get("/api/friends/daily-suggestion", requireAuth, async (req, res) => {
  try {
    const currentUserId = req.user._id;
    
    // Get the current user's gender
    const currentUser = await User.findById(currentUserId).select('gender');
    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Get current user's friends
    const currentUserWithFriends = await User.findById(currentUserId).select('friends');
    const friendIds = currentUserWithFriends.friends || [];
    
    // Get a random user of opposite gender who is not already a friend
    const randomUser = await User.aggregate([
      { 
        $match: { 
          _id: { $ne: currentUserId },
          suspended: { $ne: true },
          visible: true,
          gender: { $ne: currentUser.gender },
          _id: { $nin: friendIds }
        } 
      },
      { $sample: { size: 1 } },
      {
        $project: {
          name: 1,
          username: 1,
          profileImage: 1,
          bio: 1,
          age: 1,
          location: 1,
          interests: 1,
          isOnline: 1
        }
      }
    ]);
    
    if (randomUser.length === 0) {
      // If no users found, return a more generic message
      return res.status(404).json({ message: "No users available for daily suggestion" });
    }
    
    res.json(randomUser[0]);
  } catch (error) {
    console.error("Get daily suggestion error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// =====================
// Notifications API
// =====================
// Get notifications
app.get("/api/notifications", requireAuth, async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Get notifications for the user, sorted by timestamp (newest first)
    const notifications = await Notification.find({ userId })
      .sort({ timestamp: -1 })
      .limit(50); // Limit to 50 most recent notifications
    
    res.json(notifications);
  } catch (error) {
    console.error("Get notifications error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Mark notification as read
app.post("/api/notifications/:id/read", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    
    // Update the notification as read
    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId },
      { read: true },
      { new: true }
    );
    
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }
    
    res.json({ message: "Notification marked as read", notification });
  } catch (error) {
    console.error("Mark notification as read error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Mark all notifications as read
app.post("/api/notifications/read-all", requireAuth, async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Update all notifications for the user as read
    await Notification.updateMany(
      { userId, read: false },
      { read: true }
    );
    
    res.json({ message: "All notifications marked as read" });
  } catch (error) {
    console.error("Mark all notifications as read error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete notification
app.delete("/api/notifications/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    
    // Delete the notification
    const notification = await Notification.findOneAndDelete({
      _id: id,
      userId
    });
    
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }
    
    res.json({ message: "Notification deleted" });
  } catch (error) {
    console.error("Delete notification error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// =====================
// HTTP + Socket.IO Server
// =====================
const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

const io = new IOServer(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Track connected users
const userSockets = new Map();

const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
};

io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on("identify", (userId) => {
    if (!userId) return;
    socket.userId = userId;
    const set = userSockets.get(userId) || new Set();
    set.add(socket.id);
    userSockets.set(userId, set);
    console.log(`User ${userId} identified.`);
    io.emit("presence", { userId, online: true });
  });

  socket.on("authenticate", (token) => {
    const decoded = verifyToken(token);
    if (!decoded) {
      socket.emit("authError", { message: "Invalid token" });
      socket.disconnect();
      return;
    }

    const userId = decoded._id || decoded.id;
    socket.userId = userId;
    const set = userSockets.get(userId) || new Set();
    set.add(socket.id);
    userSockets.set(userId, set);

    socket.emit("authSuccess", { message: "Connected!", userId });
    console.log(`User ${userId} authenticated.`);
    io.emit("presence", { userId, online: true });
  });

  socket.on("typing", ({ toUserId, isTyping }) => {
    if (!socket.userId) return;
    const sockets = userSockets.get(toUserId);
    if (sockets) {
      sockets.forEach((sid) => io.to(sid).emit("typing", { from: socket.userId, isTyping }));
    }
  });

  socket.on("joinRoom", (roomId) => {
    if (!socket.userId) return;
    socket.join(roomId);
  });

  socket.on("leaveRoom", (roomId) => {
    if (!socket.userId) return;
    socket.leave(roomId);
  });

  socket.on("heartbeat", () => {
    if (socket.userId) {
      io.emit("presence", { userId: socket.userId, online: true });
    }
  });

  socket.on("matchNotification", (data) => {
    if (!socket.userId) return;
    const recipientSockets = userSockets.get(data.recipientId);
    if (recipientSockets) {
      recipientSockets.forEach((sid) => {
        io.to(sid).emit("matchNotification", {
          from: socket.userId,
          message: data.message || "New match!",
          matchData: data.matchData,
          timestamp: new Date(),
        });
      });
    }
  });

  socket.on("disconnect", () => {
    console.log(`Socket disconnected: ${socket.id}`);
    if (socket.userId) {
      const set = userSockets.get(socket.userId);
      if (set) {
        set.delete(socket.id);
        if (set.size === 0) {
          userSockets.delete(socket.userId);
          io.emit("presence", { userId: socket.userId, online: false });
        }
      }
    }
  });
});

// Attach to app
app.locals.io = io;
app.locals.userSockets = userSockets;

// =====================
// Daily Random User Feature
// =====================

// Function to send daily random user notifications
async function sendDailyRandomUserNotifications() {
  try {
    console.log("Sending daily random user notifications...");
    
    // Get all active users
    const users = await User.find({ 
      suspended: { $ne: true },
      visible: true 
    }).select('_id');
    
    let notificationCount = 0;
    
    // For each user, find a random user of opposite gender
    for (const user of users) {
      try {
        // Get the current user's gender
        const currentUser = await User.findById(user._id).select('gender');
        if (!currentUser) continue;
        
        // Get a random user of opposite gender who is not already a friend
        const randomUser = await User.aggregate([
          { 
            $match: { 
              _id: { $ne: user._id },
              suspended: { $ne: true },
              visible: true,
              gender: { $ne: currentUser.gender },
              _id: { $nin: await User.findById(user._id).then(u => u.friends || []) }
            } 
          },
          { $sample: { size: 1 } },
          {
            $project: {
              name: 1,
              username: 1,
              profileImage: 1,
              bio: 1,
              age: 1,
              location: 1
            }
          }
        ]);
        
        if (randomUser.length > 0) {
          // Create notification
          const notification = new Notification({
            userId: user._id,
            type: "daily_match",
            title: "Daily Match Suggestion",
            message: `Check out ${randomUser[0].name} as your daily match suggestion!`,
            relatedUser: randomUser[0]._id
          });
          
          await notification.save();
          notificationCount++;
          
          // Emit real-time notification via socket
          const io = app.locals.io;
          const userSockets = app.locals.userSockets;
          const recipientSockets = userSockets.get(user._id.toString());
          if (recipientSockets) {
            recipientSockets.forEach((sid) => {
              io.to(sid).emit("notification", {
                type: "daily_match",
                title: "Daily Match Suggestion",
                message: `Check out ${randomUser[0].name} as your daily match suggestion!`,
                timestamp: new Date(),
                unread: true
              });
            });
          }
        }
      } catch (userError) {
        console.error(`Error processing user ${user._id}:`, userError);
      }
    }
    
    console.log(`Sent daily notifications to ${notificationCount} users`);
  } catch (error) {
    console.error("Error sending daily notifications:", error);
  }
}

// Schedule daily notifications (runs every day at 9:00 AM)
function scheduleDailyNotifications() {
  const now = new Date();
  const nextRun = new Date();
  nextRun.setHours(9, 0, 0, 0); // 9:00 AM
  
  // If it's already past 9:00 AM today, schedule for tomorrow
  if (now > nextRun) {
    nextRun.setDate(nextRun.getDate() + 1);
  }
  
  const timeUntilNextRun = nextRun - now;
  
  setTimeout(() => {
    sendDailyRandomUserNotifications();
    // Set up recurring daily notifications
    setInterval(sendDailyRandomUserNotifications, 24 * 60 * 60 * 1000); // Every 24 hours
  }, timeUntilNextRun);
}

// Start scheduling
scheduleDailyNotifications();

// Start Server
server.listen(PORT, () => {
  console.log(`AuraMeet backend running on port ${PORT}`);
  console.log(`JWT_SECRET loaded: ${!!JWT_SECRET}`);
});