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

// Routes
import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import matchRoutes from "./routes/matchRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import systemRoutes from "./routes/systemRoutes.js";
import postRoutes from "./routes/postRoutes.js";

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
    const post = await Post.findById(postId).populate('user', 'name username profilePic gender').populate('comments.user', 'name username profilePic gender');

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
            <h3>${post.user?.name || 'YugalMeet User'}</h3>
            <p>${new Date(post.createdAt).toLocaleString()}</p>
          </div>
        </div>
        
        <div class="post-content">
          ${post.title ? `<h2 class="post-title">${post.title}</h2>` : ''}
          <p class="post-text">${post.content || ''}</p>
          ${post.image ? `<img src="${post.image}" alt="Post image" class="post-image">` : ''}
        </div>
        
        <div class="post-actions">
          <div class="action-button">
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="m8 2.748-.717-.737C5.6.281 2.514.878 1.4 3.053c-.523 1.023-.641 2.5.314 4.385.92 1.815 2.834 3.989 6.286 6.357 3.452-2.368 5.365-4.542 6.286-6.357.955-1.886.838-3.362.314-4.385C13.486.878 10.4.28 8.717 2.01L8 2.748zM8 15C-7.333 4.868 3.279-3.04 7.824 1.143c.06.055.119.112.176.171a3.12 3.12 0 0 1 .176-.17C12.72-3.042 23.333 4.867 8 15z"/>
            </svg>
            ${post.likes?.length || 0} Likes
          </div>
          <div class="action-button">
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M2.678 11.894a1 1 0 0 1 .287.801 10.97 10.97 0 0 1-.398 2c1.395-.323 2.247-.697 2.634-.893a1 1 0 0 1 .71-.074A8.06 8.06 0 0 0 8 14c3.996 0 7-2.807 7-6 0-3.192-3.004-6-7-6S1 4.808 1 8c0 1.468.617 2.83 1.678 3.894zm-.493 3.905a21.682 21.682 0 0 1-.713.129c-.2.032-.352-.176-.273-.362a9.68 9.68 0 0 0 .244-.637l.003-.01c.248-.72.45-1.548.524-2.319C.743 11.37 0 9.76 0 8c0-3.866 3.582-7 8-7s8 3.134 8 7-3.582 7-8 7a9.06 9.06 0 0 1-2.347-.306c-.52.263-1.639.742-3.468 1.105z"/>
            </svg>
            ${post.comments?.length || 0} Comments
          </div>
        </div>
        
        <div class="comments-section">
          <h3>Comments</h3>
          ${post.comments && post.comments.length > 0 ? 
            post.comments.map(comment => `
              <div class="comment">
                <div class="comment-avatar"></div>
                <div class="comment-content">
                  <div class="comment-header">
                    <span class="comment-author">${comment.user?.name || 'YugalMeet User'}</span>
                    <span class="comment-time">${new Date(comment.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                  <p class="comment-text">${comment.text}</p>
                </div>
              </div>
            `).join('') : 
            '<p>No comments yet.</p>'
          }
        </div>
        
        <a href="${process.env.FRONTEND_URL || 'https://www.yugalmeet.com'}/posts/${postId}" class="view-button">
          View Full Post on YugalMeet
        </a>
      </div>
    </body>
    </html>
    `;

    res.send(html);
  } catch (error) {
    console.error("Get post by ID error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/admin", adminRoutes);
app.use("/api/matches", matchRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/users", userRoutes);
app.use("/api/system", systemRoutes);
app.use("/api/posts", postRoutes);

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

// Start Server
server.listen(PORT, () => {
  console.log(`AuraMeet backend running on port ${PORT}`);
  console.log(`JWT_SECRET loaded: ${!!JWT_SECRET}`);
});