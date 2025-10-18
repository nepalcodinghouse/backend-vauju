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

import "./redis/redisClient.js";
import { CacheService } from "./redis/cacheService.js";
import { PresenceService } from "./redis/presenceService.js";

dotenv.config();
connectDB();

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/admin", adminRoutes);
app.use("/api/matches", matchRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/users", userRoutes);
app.use("/api/system", systemRoutes);

// Basic API route
app.get("/api", (req, res) => res.send("💘 HeartConnect API is running..."));

// ---------- SOCKET + REDIS ----------
const server = http.createServer(app);
const io = new IOServer(server, { cors: { origin: true, methods: ["GET", "POST"] } });
const userSockets = new Map();
const presenceService = new PresenceService(io);
presenceService.startPeriodicCleanup();

io.on("connection", (socket) => {
  console.log(`🔌 New socket: ${socket.id}`);
  socket.on("identify", async (userId) => {
    if (!userId) return;
    const set = userSockets.get(userId) || new Set();
    set.add(socket.id);
    userSockets.set(userId, set);
    socket.userId = userId;
    await presenceService.handleUserConnect(userId, socket.id);
  });

  socket.on("disconnect", async () => {
    console.log(`❌ Disconnected: ${socket.id}`);
    for (const [uid, set] of userSockets.entries()) {
      if (set.has(socket.id)) {
        set.delete(socket.id);
        if (set.size === 0) userSockets.delete(uid);
      }
    }
    if (socket.userId) await presenceService.handleUserDisconnect(socket.userId, socket.id);
  });
});

app.locals.io = io;
app.locals.userSockets = userSockets;
app.locals.presenceService = presenceService;
app.locals.cacheService = CacheService;

// ✅ Serve frontend in production
if (process.env.NODE_ENV === "production") {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const clientDistPath = path.join(__dirname, "client/dist");
  app.use(express.static(clientDistPath));
  app.get("*", (req, res) => res.sendFile(path.join(clientDistPath, "index.html")));
}

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
