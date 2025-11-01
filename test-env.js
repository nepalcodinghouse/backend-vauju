// Test script to verify environment variables are loaded correctly
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Get the directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("Current working directory:", process.cwd());
console.log("Script directory:", __dirname);
console.log("Expected .env file path:", path.resolve(__dirname, ".env"));

// Load environment variables from .env file
const result = dotenv.config({ path: path.resolve(__dirname, ".env") });

if (result.error) {
  console.error("Error loading .env file:", result.error);
} else {
  console.log(".env file loaded successfully");
  console.log("JWT_SECRET exists:", !!process.env.JWT_SECRET);
  if (process.env.JWT_SECRET) {
    console.log("JWT_SECRET length:", process.env.JWT_SECRET.length);
  }
}

console.log("All environment variables:", Object.keys(process.env));