import jwt from "jsonwebtoken";
import User from "../models/User.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Get the directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

// Get JWT_SECRET from environment variables - no fallback default for security
const JWT_SECRET = process.env.JWT_SECRET;

// If JWT_SECRET is not set, log an error and exit
if (!JWT_SECRET) {
  console.error("FATAL ERROR: JWT_SECRET is not defined in environment variables in auth middleware");
  console.error("Expected .env file path:", path.resolve(__dirname, "..", ".env"));
  process.exit(1);
}

export const auth = async (req, res, next) => {
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

  if (!token) {
    return res.status(401).json({ message: "Unauthorized: No token provided" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Handle both _id and id fields for backwards compatibility
    const userId = decoded._id || decoded.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized: No user ID in token" });
    }

    const user = await User.findById(userId).select("-password");
    if (!user) return res.status(401).json({ message: "Unauthorized: User not found" });

    req.user = user; // attach user to request
    next();
  } catch (err) {
    console.error("JWT error:", err);
    res.status(401).json({ message: "Unauthorized: Invalid token" });
  }
};