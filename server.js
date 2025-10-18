// server.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import http from "http";
import { Server as IOServer } from "socket.io";

// Import your routes
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import matchRoutes from "./routes/matchRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import systemRoutes from "./routes/systemRoutes.js";

dotenv.config();
connectDB();

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Health check
app.get("/api", (req, res) => {
  res.json({ status: "💘 AuraMeet API is running perfectly!" });
});

// ✅ API routes
app.use("/api/auth", authRoutes);
app.use("/admin", adminRoutes);
app.use("/api/matches", matchRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/users", userRoutes);
app.use("/api/system", systemRoutes);

// ✅ HTTP + Socket.IO server
const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

const io = new IOServer(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const userSockets = new Map();

io.on("connection", (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);

  socket.on("identify", (userId) => {
    if (!userId) return;
    const set = userSockets.get(userId) || new Set();
    set.add(socket.id);
    userSockets.set(userId, set);
    socket.userId = userId;
    console.log(`👤 User ${userId} connected.`);
  });

  socket.on("typing", ({ toUserId, isTyping }) => {
    if (!socket.userId) return;
    const sockets = userSockets.get(toUserId);
    if (sockets) {
      sockets.forEach((sid) =>
        io.to(sid).emit("typing", { from: socket.userId, isTyping })
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

  socket.on("disconnect", () => {
    console.log(`❌ Socket disconnected: ${socket.id}`);
    if (socket.userId) {
      const set = userSockets.get(socket.userId);
      if (set) {
        set.delete(socket.id);
        if (set.size === 0) userSockets.delete(socket.userId);
      }
    }
  });
});

// ✅ Start server
server.listen(PORT, () => {
  console.log(`🚀 AuraMeet backend running on port ${PORT}`);
});
