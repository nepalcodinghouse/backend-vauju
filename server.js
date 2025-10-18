import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import http from "http";
import { Server as IOServer } from "socket.io";

import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import matchRoutes from "./routes/matchRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import systemRoutes from "./routes/systemRoutes.js";

// Redis imports
import "./redis/redisClient.js";
import { CacheService } from "./redis/cacheService.js";
import { PresenceService } from "./redis/presenceService.js";

dotenv.config();
connectDB();

const app = express();
app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Basic API route
app.get("/api", (req, res) => {
  res.json({ message: "💘 AuraMeet API is running smoothly!" });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/admin", adminRoutes);
app.use("/api/matches", matchRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/users", userRoutes);
app.use("/api/system", systemRoutes);

// ✅ Serve frontend (React/Vite build)
const frontendPath = path.join(__dirname, "frontend", "dist");
app.use(express.static(frontendPath));

// ✅ Catch-all route for React Router
app.get("/*", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

// Create HTTP server
const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// ✅ Socket.IO setup
const io = new IOServer(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const userSockets = new Map(); // userId → set of socketIds
const presenceService = new PresenceService(io);
presenceService.startPeriodicCleanup();

io.on("connection", (socket) => {
  console.log(`🔌 New socket connected: ${socket.id}`);

  socket.on("identify", async (userId) => {
    if (!userId) return;
    const set = userSockets.get(userId) || new Set();
    set.add(socket.id);
    userSockets.set(userId, set);
    socket.userId = userId;
    await presenceService.handleUserConnect(userId, socket.id);
    console.log(`👤 User ${userId} identified.`);
  });

  socket.on("typing", async ({ toUserId, isTyping }) => {
    if (socket.userId) {
      await presenceService.handleTyping(socket.userId, toUserId, isTyping);
    }
  });

  socket.on("activity", async ({ activity }) => {
    if (socket.userId) {
      await presenceService.handleUserActivity(socket.userId, activity);
    }
  });

  socket.on("messageRead", async ({ messageId, fromUserId }) => {
    if (!socket.userId) return;
    const senderSockets = userSockets.get(fromUserId);
    if (senderSockets) {
      senderSockets.forEach((sid) =>
        io.to(sid).emit("messageRead", { messageId, readBy: socket.userId })
      );
    }
  });

  socket.on("joinRoom", (roomId) => {
    socket.join(roomId);
    console.log(`👥 User ${socket.userId} joined room: ${roomId}`);
  });

  socket.on("leaveRoom", (roomId) => {
    socket.leave(roomId);
    console.log(`👥 User ${socket.userId} left room: ${roomId}`);
  });

  socket.on("disconnect", async () => {
    console.log(`❌ Socket disconnected: ${socket.id}`);
    for (const [userId, set] of userSockets.entries()) {
      if (set.has(socket.id)) {
        set.delete(socket.id);
        if (set.size === 0) userSockets.delete(userId);
      }
    }
    if (socket.userId) {
      await presenceService.handleUserDisconnect(socket.userId, socket.id);
    }
  });
});

// Expose shared services
app.locals.io = io;
app.locals.userSockets = userSockets;
app.locals.presenceService = presenceService;
app.locals.cacheService = CacheService;

// Start server
server.listen(PORT, () =>
  console.log(`🚀 AuraMeet Backend running on port ${PORT}`)
);
