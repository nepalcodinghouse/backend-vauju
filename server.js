// server.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import http from "http";
import { Server as IOServer } from "socket.io";
import jwt from "jsonwebtoken";
import connectDB from "./config/db.js";

// Routes
import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import matchRoutes from "./routes/matchRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import systemRoutes from "./routes/systemRoutes.js";
import postRoutes from "./routes/postRoutes.js";

dotenv.config();
connectDB();

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from uploads directory
app.use('/uploads', express.static('uploads'));

// JWT secret
const JWT_SECRET = process.env.JWT_SECRET || "your_secret_key";

// =====================
// Middleware to protect routes
// =====================
export const requireAuth = (req, res, next) => {
  const token = req.headers["x-user-id"];
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
// Express routes
// =====================
app.get("/api", (req, res) => {
  res.json({ status: "💘 AuraMeet API is running perfectly!" });
});

app.use("/api/auth", authRoutes);
app.use("/admin", adminRoutes);
app.use("/api/matches", matchRoutes);
app.use("/api/profile", profileRoutes); // protected inside profileRoutes
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
  cors: { origin: "*", methods: ["GET", "POST"] },
});

// Track user socket connections
const userSockets = new Map();

// Helper to verify JWT in Socket.IO
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
};

// Socket.IO connection
io.on("connection", (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);

  // JWT auth for socket
  socket.on("authenticate", (token) => {
    const decoded = verifyToken(token);
    if (!decoded) {
      socket.emit("authError", { message: "❌ Invalid or expired token" });
      socket.disconnect();
      return;
    }

    const userId = decoded._id || decoded.id;
    socket.userId = userId;

    // Track user's sockets
    const set = userSockets.get(userId) || new Set();
    set.add(socket.id);
    userSockets.set(userId, set);

    // ✅ Send auth success message
    socket.emit("authSuccess", {
      message: "✅ JWT verified! You are now connected.",
      userId,
    });

    console.log(`🟢 JWT verified for user ${userId}. Socket ${socket.id} connected.`);
    io.emit("presence", { userId, online: true });
  });

  // Typing indicator
  socket.on("typing", ({ toUserId, isTyping }) => {
    if (!socket.userId) return;
    const sockets = userSockets.get(toUserId);
    if (sockets) {
      sockets.forEach((sid) =>
        io.to(sid).emit("typing", { from: socket.userId, isTyping })
      );
    }
  });

  // Join / leave chat rooms
  socket.on("joinRoom", (roomId) => {
    if (!socket.userId) return;
    socket.join(roomId);
    console.log(`👥 User ${socket.userId} joined room: ${roomId}`);
  });

  socket.on("leaveRoom", (roomId) => {
    if (!socket.userId) return;
    socket.leave(roomId);
    console.log(`👥 User ${socket.userId} left room: ${roomId}`);
  });

  // Heartbeat for online presence
  socket.on("heartbeat", () => {
    if (socket.userId) io.emit("presence", { userId: socket.userId, online: true });
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    console.log(`❌ Socket disconnected: ${socket.id}`);
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

// Attach Socket.IO map to Express
app.locals.io = io;
app.locals.userSockets = userSockets;

// Start server
server.listen(PORT, () => {
  console.log(`🚀 AuraMeet backend running on port ${PORT}`);
});
