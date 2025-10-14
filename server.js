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
import userRoutes from "./routes/userRoutes.js"; // <-- new

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

// New API: fetch user by username
app.use("/api/users", userRoutes);

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// Socket.IO setup
const userSockets = new Map(); // userId -> set of socketIds
const io = new IOServer(server, {
  cors: { origin: true, methods: ["GET", "POST"] },
});

io.on("connection", (socket) => {
  // Client should emit 'identify' after connecting with userId
  socket.on("identify", (userId) => {
    if (!userId) return;
    const set = userSockets.get(userId) || new Set();
    set.add(socket.id);
    userSockets.set(userId, set);
    io.emit("presence", { userId, online: true });
  });

  socket.on("disconnect", () => {
    for (const [userId, set] of userSockets.entries()) {
      if (set.has(socket.id)) {
        set.delete(socket.id);
        if (set.size === 0) {
          userSockets.delete(userId);
          io.emit("presence", { userId, online: false });
        }
      }
    }
  });
});

// Expose io and userSockets for controllers
app.locals.io = io;
app.locals.userSockets = userSockets;

// Start server
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
