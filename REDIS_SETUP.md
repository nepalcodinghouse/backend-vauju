# Redis Setup Guide

## 🚀 Quick Redis Setup for Windows

### Option 1: Using Docker (Recommended)
1. **Install Docker Desktop** from https://www.docker.com/products/docker-desktop/
2. **Run Redis container**:
   ```bash
   docker run -d --name redis-vauju -p 6379:6379 redis:alpine
   ```
3. **Verify Redis is running**:
   ```bash
   docker ps
   ```

### Option 2: Using WSL2 (Windows Subsystem for Linux)
1. **Install WSL2** and Ubuntu
2. **Install Redis in WSL**:
   ```bash
   sudo apt update
   sudo apt install redis-server
   sudo service redis-server start
   ```

### Option 3: Redis for Windows (Legacy)
1. **Download** from https://github.com/microsoftarchive/redis/releases
2. **Extract** and run `redis-server.exe`

## 🔧 Configuration

### Environment Variables
Make sure your `.env` file has:
```env
REDIS_URL=redis://localhost:6379
```

For Redis Cloud or remote Redis:
```env
REDIS_URL=redis://username:password@host:port
```

## 🧪 Testing Redis Connection

### Test with Redis CLI:
```bash
# If using Docker:
docker exec -it redis-vauju redis-cli ping

# Should return: PONG
```

### Test with your app:
```bash
# Start your server
npm run dev

# Check logs for:
# "✅ Redis connected successfully"
```

## 🛠️ Troubleshooting

### Common Issues:

1. **ECONNREFUSED**: Redis server not running
   - Start Redis server first
   - Check if port 6379 is available

2. **REDIS_URL not set**:
   - Add to your `.env` file
   - Default will use `redis://localhost:6379`

3. **Connection timeout**:
   - Check firewall settings
   - Verify Redis server is accessible

### Fallback Mode
If Redis fails to connect, the app will:
- ✅ Continue running normally
- ✅ Use in-memory storage for presence
- ✅ Show "📝 Continuing without Redis - using fallback mode" message
- ❌ No persistent caching (slower performance)

## 📊 Monitoring

### Check Redis Status:
- Visit: `http://localhost:5000/api/system/health`
- Should show Redis status as "connected" or "disconnected"

### Clear Cache (if needed):
```bash
# Clear all cache
curl -X DELETE http://localhost:5000/api/system/cache/clear

# Or use Redis CLI
redis-cli FLUSHDB
```

## 🎯 Benefits When Redis is Running

- **🚀 Faster load times** (5x improvement for profiles/matches)
- **⚡ Real-time presence** (accurate online status)
- **💾 Persistent sessions** (survives server restarts)
- **📈 Better scalability** (handles more concurrent users)

## 📝 Development vs Production

### Development (Local):
- Redis optional (fallback mode works)
- Use Docker for easy setup

### Production:
- Redis **highly recommended**
- Use Redis Cloud, AWS ElastiCache, or similar
- Configure proper authentication and SSL

---

**Need help?** Check the server logs for detailed Redis connection information.
