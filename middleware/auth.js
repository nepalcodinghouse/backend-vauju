import jwt from "jsonwebtoken";
import User from "../models/User.js";

const JWT_SECRET = process.env.JWT_SECRET || "your_secret_key";

export const auth = async (req, res, next) => {
  // Try to get token from both Authorization header and x-user-id header
  let token = null;
  
  // First check x-user-id header (preferred by frontend)
  if (req.headers["x-user-id"]) {
    token = req.headers["x-user-id"];
  }
  // Fallback to Authorization header
  else if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
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
