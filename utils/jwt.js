import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your_secret_key";

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    console.error("JWT verification error:", err.message);
    return null;
  }
};

export const signToken = (payload, expiresIn = "7d") => {
  try {
    return jwt.sign(payload, JWT_SECRET, { expiresIn });
  } catch (err) {
    console.error("JWT signing error:", err.message);
    return null;
  }
};
