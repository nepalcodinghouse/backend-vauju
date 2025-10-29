// server.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import http from "http";
import { Server as IOServer } from "socket.io";
import jwt from "jsonwebtoken";
import connectDB from "./config/db.js";

// Import Models
import User from "./models/User.js";

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

// CORS Configuration
const allowedOrigins = [
  "http://localhost:5173",
  "https://vauju-dating-app.vercel.app",
  "https://www.yugalmeet.com",
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
app.use(express.json());

// Serve static files
app.use("/uploads", express.static("uploads"));

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || "your_secret_key";

// =====================
// Auth Middleware
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
});