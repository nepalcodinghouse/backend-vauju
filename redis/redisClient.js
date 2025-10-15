import { createClient } from "redis";

// Redis connection state
let isRedisConnected = false;
let redisClient = null;

// Initialize Redis client
const initializeRedis = async () => {
  try {
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      retry_unfulfilled_commands: true,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries < 10) {
            return Math.min(retries * 50, 1000); // Exponential backoff
          }
          return false; // Stop retrying after 10 attempts
        }
      }
    });

    redisClient.on("error", (err) => {
      console.log("⚠️ Redis Client Error:", err.message);
      isRedisConnected = false;
    });

    redisClient.on("connect", () => {
      console.log("🔗 Redis Client Connecting...");
    });

    redisClient.on("ready", () => {
      console.log("✅ Redis Client Ready");
      isRedisConnected = true;
    });

    redisClient.on("end", () => {
      console.log("🔌 Redis Client Disconnected");
      isRedisConnected = false;
    });

    redisClient.on("reconnecting", () => {
      console.log("🔄 Redis Client Reconnecting...");
    });

    // Attempt to connect
    await redisClient.connect();
    console.log("✅ Redis connected successfully");
    isRedisConnected = true;
    
  } catch (error) {
    console.error("❌ Redis connection failed:", error.message);
    console.log("📝 Continuing without Redis - using fallback mode");
    isRedisConnected = false;
    redisClient = null;
  }
};

// Safe Redis client wrapper
const safeRedisClient = {
  isConnected: () => isRedisConnected,
  
  async get(key) {
    if (!isRedisConnected || !redisClient) return null;
    try {
      return await redisClient.get(key);
    } catch (error) {
      console.error('Redis GET error:', error.message);
      return null;
    }
  },
  
  async set(key, value) {
    if (!isRedisConnected || !redisClient) return false;
    try {
      await redisClient.set(key, value);
      return true;
    } catch (error) {
      console.error('Redis SET error:', error.message);
      return false;
    }
  },
  
  async setEx(key, seconds, value) {
    if (!isRedisConnected || !redisClient) return false;
    try {
      await redisClient.setEx(key, seconds, value);
      return true;
    } catch (error) {
      console.error('Redis SETEX error:', error.message);
      return false;
    }
  },
  
  async del(key) {
    if (!isRedisConnected || !redisClient) return 0;
    try {
      return await redisClient.del(key);
    } catch (error) {
      console.error('Redis DEL error:', error.message);
      return 0;
    }
  },
  
  async keys(pattern) {
    if (!isRedisConnected || !redisClient) return [];
    try {
      return await redisClient.keys(pattern);
    } catch (error) {
      console.error('Redis KEYS error:', error.message);
      return [];
    }
  },
  
  async sAdd(key, member) {
    if (!isRedisConnected || !redisClient) return 0;
    try {
      return await redisClient.sAdd(key, member);
    } catch (error) {
      console.error('Redis SADD error:', error.message);
      return 0;
    }
  },
  
  async sRem(key, member) {
    if (!isRedisConnected || !redisClient) return 0;
    try {
      return await redisClient.sRem(key, member);
    } catch (error) {
      console.error('Redis SREM error:', error.message);
      return 0;
    }
  },
  
  async sIsMember(key, member) {
    if (!isRedisConnected || !redisClient) return false;
    try {
      return await redisClient.sIsMember(key, member);
    } catch (error) {
      console.error('Redis SISMEMBER error:', error.message);
      return false;
    }
  },
  
  async sMembers(key) {
    if (!isRedisConnected || !redisClient) return [];
    try {
      return await redisClient.sMembers(key);
    } catch (error) {
      console.error('Redis SMEMBERS error:', error.message);
      return [];
    }
  },
  
  async lPush(key, element) {
    if (!isRedisConnected || !redisClient) return 0;
    try {
      return await redisClient.lPush(key, element);
    } catch (error) {
      console.error('Redis LPUSH error:', error.message);
      return 0;
    }
  },
  
  async lTrim(key, start, stop) {
    if (!isRedisConnected || !redisClient) return false;
    try {
      await redisClient.lTrim(key, start, stop);
      return true;
    } catch (error) {
      console.error('Redis LTRIM error:', error.message);
      return false;
    }
  },
  
  async lRange(key, start, stop) {
    if (!isRedisConnected || !redisClient) return [];
    try {
      return await redisClient.lRange(key, start, stop);
    } catch (error) {
      console.error('Redis LRANGE error:', error.message);
      return [];
    }
  },
  
  async expire(key, seconds) {
    if (!isRedisConnected || !redisClient) return false;
    try {
      return await redisClient.expire(key, seconds);
    } catch (error) {
      console.error('Redis EXPIRE error:', error.message);
      return false;
    }
  },
  
  async flushDb() {
    if (!isRedisConnected || !redisClient) return false;
    try {
      await redisClient.flushDb();
      return true;
    } catch (error) {
      console.error('Redis FLUSHDB error:', error.message);
      return false;
    }
  },
  
  async info(section) {
    if (!isRedisConnected || !redisClient) return null;
    try {
      return await redisClient.info(section);
    } catch (error) {
      console.error('Redis INFO error:', error.message);
      return null;
    }
  }
};

// Initialize Redis connection
initializeRedis();

export default safeRedisClient;
