import { createClient } from "redis";

const redisClient = createClient({
  url: process.env.REDIS_URL,
});

redisClient.on("error", (err) => console.log("Redis Client Error", err));
redisClient.on("connect", () => console.log("Redis Client Connected"));
redisClient.on("ready", () => console.log("Redis Client Ready"));

// Connect with error handling
try {
  await redisClient.connect();
  console.log("✅ Redis connected successfully");
} catch (error) {
  console.error("❌ Redis connection failed:", error);
}

export default redisClient;
