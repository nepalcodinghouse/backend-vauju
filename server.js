import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();
connectDB();

const app = express();
app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Uploads/static image serving removed (profile images disabled)

app.get("/", (req, res) => res.send("💘 HeartConnect API is running..."));
app.use("/api/auth", authRoutes);

app.use("/api/profile", profileRoutes);
app.use("/api/messages", messageRoutes);

import http from "http";
import { Server as IOServer } from "socket.io";

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// simple map userId -> set of socketIds
const userSockets = new Map();

const io = new IOServer(server, {
	cors: { origin: true, methods: ["GET", "POST"] }
});

io.on("connection", (socket) => {
	// client should emit 'identify' after connecting with their userId
	socket.on("identify", (userId) => {
		if (!userId) return;
		const set = userSockets.get(userId) || new Set();
		set.add(socket.id);
		userSockets.set(userId, set);
		// broadcast presence online
		io.emit("presence", { userId, online: true });
	});

	socket.on("disconnect", () => {
		// remove socket from all user mappings
		for (const [userId, set] of userSockets.entries()) {
			if (set.has(socket.id)) {
				set.delete(socket.id);
				if (set.size === 0) {
					userSockets.delete(userId);
					// broadcast presence offline when last socket goes away
					io.emit("presence", { userId, online: false });
				}
			}
		}
	});
});

// expose io and userSockets for controllers to emit
app.locals.io = io;
app.locals.userSockets = userSockets;

server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
