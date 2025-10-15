import { CacheService } from './cacheService.js';

export class PresenceService {
  constructor(io) {
    this.io = io;
    this.heartbeatInterval = 30000; // 30 seconds
    this.presenceTimeout = 90000; // 1.5 minutes
    this.activeHeartbeats = new Map(); // userId -> intervalId
  }

  /**
   * User connects via socket
   */
  async handleUserConnect(userId, socketId) {
    try {
      console.log(`👤 User ${userId} connected with socket ${socketId}`);
      
      // Set user online in Redis
      await CacheService.setUserOnline(userId, socketId);
      
      // Start heartbeat for this user
      this.startHeartbeat(userId);
      
      // Broadcast presence to all connected users
      this.io.emit('userOnline', { userId, timestamp: Date.now() });
      
      // Get and broadcast current online users list
      const onlineUsers = await this.getOnlineUsersList();
      this.io.emit('onlineUsersList', onlineUsers);
      
    } catch (error) {
      console.error('Error handling user connect:', error);
    }
  }

  /**
   * User disconnects
   */
  async handleUserDisconnect(userId, socketId) {
    try {
      console.log(`👤 User ${userId} disconnected from socket ${socketId}`);
      
      // Stop heartbeat for this user
      this.stopHeartbeat(userId);
      
      // Set user offline in Redis
      await CacheService.setUserOffline(userId);
      
      // Broadcast presence to all connected users
      this.io.emit('userOffline', { userId, timestamp: Date.now() });
      
      // Get and broadcast updated online users list
      const onlineUsers = await this.getOnlineUsersList();
      this.io.emit('onlineUsersList', onlineUsers);
      
    } catch (error) {
      console.error('Error handling user disconnect:', error);
    }
  }

  /**
   * Start heartbeat for a user
   */
  startHeartbeat(userId) {
    // Clear existing heartbeat if any
    this.stopHeartbeat(userId);
    
    const intervalId = setInterval(async () => {
      try {
        await CacheService.setUserOnline(userId);
      } catch (error) {
        console.error(`Error in heartbeat for user ${userId}:`, error);
        this.stopHeartbeat(userId);
      }
    }, this.heartbeatInterval);
    
    this.activeHeartbeats.set(userId, intervalId);
  }

  /**
   * Stop heartbeat for a user
   */
  stopHeartbeat(userId) {
    const intervalId = this.activeHeartbeats.get(userId);
    if (intervalId) {
      clearInterval(intervalId);
      this.activeHeartbeats.delete(userId);
    }
  }

  /**
   * Get list of online users
   */
  async getOnlineUsersList() {
    try {
      return await CacheService.getOnlineUsers();
    } catch (error) {
      console.error('Error getting online users list:', error);
      return [];
    }
  }

  /**
   * Check if a specific user is online
   */
  async isUserOnline(userId) {
    try {
      return await CacheService.isUserOnline(userId);
    } catch (error) {
      console.error(`Error checking if user ${userId} is online:`, error);
      return false;
    }
  }

  /**
   * Get user's presence info
   */
  async getUserPresence(userId) {
    try {
      return await CacheService.getUserPresence(userId);
    } catch (error) {
      console.error(`Error getting presence for user ${userId}:`, error);
      return null;
    }
  }

  /**
   * Handle user activity (typing, seen message, etc.)
   */
  async handleUserActivity(userId, activity) {
    try {
      const presence = await CacheService.getUserPresence(userId);
      if (presence) {
        // Update timestamp to show recent activity
        await CacheService.setUserOnline(userId, presence.socketId);
        
        // Broadcast activity to relevant users
        this.io.emit('userActivity', { 
          userId, 
          activity, 
          timestamp: Date.now() 
        });
      }
    } catch (error) {
      console.error(`Error handling activity for user ${userId}:`, error);
    }
  }

  /**
   * Handle typing indicators
   */
  async handleTyping(fromUserId, toUserId, isTyping) {
    try {
      // Only send to specific recipient
      this.io.emit('userTyping', {
        fromUserId,
        toUserId,
        isTyping,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Error handling typing indicator:', error);
    }
  }

  /**
   * Cleanup inactive users (called periodically)
   */
  async cleanupInactiveUsers() {
    try {
      const onlineUsers = await CacheService.getOnlineUsers();
      const now = Date.now();
      
      for (const userId of onlineUsers) {
        const presence = await CacheService.getUserPresence(userId);
        if (presence && (now - presence.timestamp) > this.presenceTimeout) {
          console.log(`🧹 Cleaning up inactive user: ${userId}`);
          await this.handleUserDisconnect(userId, presence.socketId);
        }
      }
    } catch (error) {
      console.error('Error cleaning up inactive users:', error);
    }
  }

  /**
   * Start periodic cleanup
   */
  startPeriodicCleanup() {
    setInterval(() => {
      this.cleanupInactiveUsers();
    }, 60000); // Run every minute
    
    console.log('🧹 Started periodic user presence cleanup');
  }

  /**
   * Get presence statistics
   */
  async getPresenceStats() {
    try {
      const onlineUsers = await CacheService.getOnlineUsers();
      const stats = {
        totalOnline: onlineUsers.length,
        activeHeartbeats: this.activeHeartbeats.size,
        onlineUsers: onlineUsers
      };
      
      return stats;
    } catch (error) {
      console.error('Error getting presence stats:', error);
      return {
        totalOnline: 0,
        activeHeartbeats: 0,
        onlineUsers: []
      };
    }
  }
}

export default PresenceService;
