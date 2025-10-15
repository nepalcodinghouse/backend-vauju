import redisClient from './redisClient.js';

// In-memory fallback when Redis is unavailable
const memoryStore = {
  cache: new Map(),
  sets: new Map(),
  lists: new Map(),
  onlineUsers: new Set()
};

// Cache keys
const KEYS = {
  USER_PROFILE: (userId) => `user:profile:${userId}`,
  USER_MATCHES: (userId, page = 1) => `user:matches:${userId}:page:${page}`,
  CONVERSATION: (userId1, userId2) => `conversation:${[userId1, userId2].sort().join(':')}`,
  ONLINE_USERS: 'users:online',
  USER_PRESENCE: (userId) => `user:presence:${userId}`,
  MESSAGE_CACHE: (conversationId) => `messages:${conversationId}`,
  MATCH_QUEUE: 'matches:queue',
  USER_SESSIONS: (userId) => `user:sessions:${userId}`,
};

// Cache expiration times (in seconds)
const TTL = {
  USER_PROFILE: 300, // 5 minutes
  USER_MATCHES: 180, // 3 minutes
  CONVERSATION: 600, // 10 minutes
  PRESENCE: 90, // 1.5 minutes
  MESSAGE_CACHE: 1800, // 30 minutes
  SESSION: 86400, // 24 hours
};

export class CacheService {
  // User Profile Caching
  static async cacheUserProfile(userId, profileData) {
    try {
      if (redisClient.isConnected()) {
        const key = KEYS.USER_PROFILE(userId);
        await redisClient.setEx(key, TTL.USER_PROFILE, JSON.stringify(profileData));
        console.log(`📝 Cached profile for user: ${userId} (Redis)`);
      } else {
        // Fallback to memory
        memoryStore.cache.set(KEYS.USER_PROFILE(userId), {
          data: profileData,
          expires: Date.now() + (TTL.USER_PROFILE * 1000)
        });
        console.log(`📝 Cached profile for user: ${userId} (Memory)`);
      }
    } catch (error) {
      console.error('Error caching user profile:', error);
    }
  }

  static async getUserProfile(userId) {
    try {
      if (redisClient.isConnected()) {
        const key = KEYS.USER_PROFILE(userId);
        const cached = await redisClient.get(key);
        if (cached) {
          console.log(`📖 Retrieved cached profile for user: ${userId} (Redis)`);
          return JSON.parse(cached);
        }
      } else {
        // Fallback to memory
        const key = KEYS.USER_PROFILE(userId);
        const cached = memoryStore.cache.get(key);
        if (cached && cached.expires > Date.now()) {
          console.log(`📖 Retrieved cached profile for user: ${userId} (Memory)`);
          return cached.data;
        } else if (cached) {
          memoryStore.cache.delete(key); // Remove expired
        }
      }
      return null;
    } catch (error) {
      console.error('Error getting cached user profile:', error);
      return null;
    }
  }

  static async invalidateUserProfile(userId) {
    try {
      const key = KEYS.USER_PROFILE(userId);
      await redisClient.del(key);
      console.log(`🗑️ Invalidated profile cache for user: ${userId}`);
    } catch (error) {
      console.error('Error invalidating user profile:', error);
    }
  }

  // Matches Caching
  static async cacheMatches(userId, page, matchesData) {
    try {
      const key = KEYS.USER_MATCHES(userId, page);
      await redisClient.setEx(key, TTL.USER_MATCHES, JSON.stringify(matchesData));
      console.log(`📝 Cached matches for user: ${userId}, page: ${page}`);
    } catch (error) {
      console.error('Error caching matches:', error);
    }
  }

  static async getMatches(userId, page) {
    try {
      const key = KEYS.USER_MATCHES(userId, page);
      const cached = await redisClient.get(key);
      if (cached) {
        console.log(`📖 Retrieved cached matches for user: ${userId}, page: ${page}`);
        return JSON.parse(cached);
      }
      return null;
    } catch (error) {
      console.error('Error getting cached matches:', error);
      return null;
    }
  }

  static async invalidateAllMatches(userId) {
    try {
      const pattern = KEYS.USER_MATCHES(userId, '*').replace('*', '*');
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
        console.log(`🗑️ Invalidated ${keys.length} match cache entries for user: ${userId}`);
      }
    } catch (error) {
      console.error('Error invalidating matches cache:', error);
    }
  }

  // Conversation Caching
  static async cacheConversation(userId1, userId2, messages) {
    try {
      const key = KEYS.CONVERSATION(userId1, userId2);
      await redisClient.setEx(key, TTL.CONVERSATION, JSON.stringify(messages));
      console.log(`📝 Cached conversation between: ${userId1} and ${userId2}`);
    } catch (error) {
      console.error('Error caching conversation:', error);
    }
  }

  static async getConversation(userId1, userId2) {
    try {
      const key = KEYS.CONVERSATION(userId1, userId2);
      const cached = await redisClient.get(key);
      if (cached) {
        console.log(`📖 Retrieved cached conversation between: ${userId1} and ${userId2}`);
        return JSON.parse(cached);
      }
      return null;
    } catch (error) {
      console.error('Error getting cached conversation:', error);
      return null;
    }
  }

  static async invalidateConversation(userId1, userId2) {
    try {
      const key = KEYS.CONVERSATION(userId1, userId2);
      await redisClient.del(key);
      console.log(`🗑️ Invalidated conversation cache between: ${userId1} and ${userId2}`);
    } catch (error) {
      console.error('Error invalidating conversation:', error);
    }
  }

  // Message Caching (for recent messages)
  static async addMessageToCache(conversationId, message) {
    try {
      const key = KEYS.MESSAGE_CACHE(conversationId);
      // Use Redis lists to store recent messages
      await redisClient.lPush(key, JSON.stringify(message));
      // Keep only last 50 messages in cache
      await redisClient.lTrim(key, 0, 49);
      await redisClient.expire(key, TTL.MESSAGE_CACHE);
      console.log(`💬 Added message to cache for conversation: ${conversationId}`);
    } catch (error) {
      console.error('Error adding message to cache:', error);
    }
  }

  static async getRecentMessages(conversationId, count = 20) {
    try {
      const key = KEYS.MESSAGE_CACHE(conversationId);
      const messages = await redisClient.lRange(key, 0, count - 1);
      return messages.map(msg => JSON.parse(msg)).reverse(); // Reverse to get chronological order
    } catch (error) {
      console.error('Error getting recent messages:', error);
      return [];
    }
  }

  // Online Presence Management
  static async setUserOnline(userId, socketId = null) {
    try {
      if (redisClient.isConnected()) {
        // Add to online users set
        await redisClient.sAdd(KEYS.ONLINE_USERS, userId);
        
        // Set individual user presence with timestamp
        const presenceData = {
          userId,
          timestamp: Date.now(),
          socketId: socketId || null,
          status: 'online'
        };
        
        await redisClient.setEx(
          KEYS.USER_PRESENCE(userId), 
          TTL.PRESENCE, 
          JSON.stringify(presenceData)
        );
        
        console.log(`🟢 User ${userId} set online (Redis)`);
      } else {
        // Fallback to memory
        memoryStore.onlineUsers.add(userId);
        memoryStore.cache.set(KEYS.USER_PRESENCE(userId), {
          data: {
            userId,
            timestamp: Date.now(),
            socketId: socketId || null,
            status: 'online'
          },
          expires: Date.now() + (TTL.PRESENCE * 1000)
        });
        console.log(`🟢 User ${userId} set online (Memory)`);
      }
      return true;
    } catch (error) {
      console.error('Error setting user online:', error);
      return false;
    }
  }

  static async setUserOffline(userId) {
    try {
      // Remove from online users set
      await redisClient.sRem(KEYS.ONLINE_USERS, userId);
      
      // Update presence status
      const presenceData = {
        userId,
        timestamp: Date.now(),
        status: 'offline'
      };
      
      await redisClient.setEx(
        KEYS.USER_PRESENCE(userId), 
        TTL.PRESENCE, 
        JSON.stringify(presenceData)
      );
      
      console.log(`🔴 User ${userId} set offline`);
      return true;
    } catch (error) {
      console.error('Error setting user offline:', error);
      return false;
    }
  }

  static async isUserOnline(userId) {
    try {
      if (redisClient.isConnected()) {
        const isOnline = await redisClient.sIsMember(KEYS.ONLINE_USERS, userId);
        return isOnline;
      } else {
        // Fallback to memory
        return memoryStore.onlineUsers.has(userId);
      }
    } catch (error) {
      console.error('Error checking if user is online:', error);
      return false;
    }
  }

  static async getOnlineUsers() {
    try {
      if (redisClient.isConnected()) {
        const onlineUsers = await redisClient.sMembers(KEYS.ONLINE_USERS);
        return onlineUsers;
      } else {
        // Fallback to memory
        return Array.from(memoryStore.onlineUsers);
      }
    } catch (error) {
      console.error('Error getting online users:', error);
      return [];
    }
  }

  static async getUserPresence(userId) {
    try {
      const key = KEYS.USER_PRESENCE(userId);
      const presence = await redisClient.get(key);
      return presence ? JSON.parse(presence) : null;
    } catch (error) {
      console.error('Error getting user presence:', error);
      return null;
    }
  }

  // Session Management
  static async createUserSession(userId, sessionData) {
    try {
      const key = KEYS.USER_SESSIONS(userId);
      await redisClient.setEx(key, TTL.SESSION, JSON.stringify(sessionData));
      console.log(`🔐 Created session for user: ${userId}`);
    } catch (error) {
      console.error('Error creating user session:', error);
    }
  }

  static async getUserSession(userId) {
    try {
      const key = KEYS.USER_SESSIONS(userId);
      const session = await redisClient.get(key);
      return session ? JSON.parse(session) : null;
    } catch (error) {
      console.error('Error getting user session:', error);
      return null;
    }
  }

  static async invalidateUserSession(userId) {
    try {
      const key = KEYS.USER_SESSIONS(userId);
      await redisClient.del(key);
      console.log(`🗑️ Invalidated session for user: ${userId}`);
    } catch (error) {
      console.error('Error invalidating user session:', error);
    }
  }

  // General Cache Management
  static async clearAllCache() {
    try {
      await redisClient.flushDb();
      console.log('🗑️ Cleared all Redis cache');
    } catch (error) {
      console.error('Error clearing all cache:', error);
    }
  }

  static async getCacheStats() {
    try {
      const info = await redisClient.info('memory');
      const keyspace = await redisClient.info('keyspace');
      return {
        memory: info,
        keyspace: keyspace
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return null;
    }
  }
}

export default CacheService;
