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
import "./redis/redisClient.js"; // Initialize Redis connection
import { CacheService } from "./redis/cacheService.js";
import { PresenceService } from "./redis/presenceService.js";

dotenv.config();
connectDB();

const app = express();
app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Basic route
app.get("/", (req, res) => res.send("💘 HeartConnect API is running..."));

// Routes
app.use("/api/auth", authRoutes);
app.use("/admin", adminRoutes);
app.use("/api/matches", matchRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/messages", messageRoutes);

// API routes
app.use("/api/users", userRoutes);
app.use("/api/system", systemRoutes);

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// Socket.IO setup with Redis integration
const userSockets = new Map(); // userId -> set of socketIds (legacy support)
const io = new IOServer(server, {
  cors: { origin: true, methods: ["GET", "POST"] },
});

// Initialize Redis-based presence service
const presenceService = new PresenceService(io);
presenceService.startPeriodicCleanup();

io.on("connection", (socket) => {
  console.log(`🔌 New socket connection: ${socket.id}`);

  // Client identifies themselves with userId
  socket.on("identify", async (userId) => {
    if (!userId) {
      console.warn("Socket identify without userId");
      return;
    }

    try {
      // Legacy socket tracking
      const set = userSockets.get(userId) || new Set();
      set.add(socket.id);
      userSockets.set(userId, set);
      
      // Store userId on socket for cleanup
      socket.userId = userId;

      // Redis-based presence tracking
      await presenceService.handleUserConnect(userId, socket.id);

      console.log(`👤 User ${userId} identified on socket ${socket.id}`);
    } catch (error) {
      console.error(`Error identifying user ${userId}:`, error);
    }
  });

  // Handle user typing indicators
  socket.on("typing", async ({ toUserId, isTyping }) => {
    if (socket.userId) {
      await presenceService.handleTyping(socket.userId, toUserId, isTyping);
    }
  });

  // Handle user activity (for keeping user active)
  socket.on("activity", async ({ activity }) => {
    if (socket.userId) {
      await presenceService.handleUserActivity(socket.userId, activity);
    }
  });

  // Handle message read receipts
  socket.on("messageRead", async ({ messageId, fromUserId }) => {
    if (socket.userId) {
      // Emit to sender that message was read
      const senderSockets = userSockets.get(fromUserId);
      if (senderSockets) {
        senderSockets.forEach(sid => {
          io.to(sid).emit('messageRead', { messageId, readBy: socket.userId });
        });
      }
    }
  });

  // Handle join room for private messaging
  socket.on("joinRoom", (roomId) => {
    socket.join(roomId);
    console.log(`👤 User ${socket.userId} joined room: ${roomId}`);
  });

  // Handle leave room
  socket.on("leaveRoom", (roomId) => {
    socket.leave(roomId);
    console.log(`👤 User ${socket.userId} left room: ${roomId}`);
  });

  // Handle disconnect
  socket.on("disconnect", async () => {
    console.log(`🔌 Socket disconnected: ${socket.id}`);
    
    try {
      // Legacy socket cleanup
      for (const [userId, set] of userSockets.entries()) {
        if (set.has(socket.id)) {
          set.delete(socket.id);
          if (set.size === 0) {
            userSockets.delete(userId);
          }
        }
      }

      // Redis-based presence cleanup
      if (socket.userId) {
        await presenceService.handleUserDisconnect(socket.userId, socket.id);
      }
    } catch (error) {
      console.error('Error handling socket disconnect:', error);
    }
  });
});

// Expose io, userSockets, and services for controllers
app.locals.io = io;
app.locals.userSockets = userSockets;
app.locals.presenceService = presenceService;
app.locals.cacheService = CacheService;

// Start server
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
