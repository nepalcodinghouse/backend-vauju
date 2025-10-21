# 🚀 Quick Start Guide

## Start the Backend Server

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Server
```bash
# Development mode (with auto-reload)
npm run dev

# OR Production mode
npm start
```

### 3. Verify Server is Running
- Open http://localhost:5000/api in your browser
- You should see: `{"status":"💘 AuraMeet API is running perfectly!"}`

## 🔧 Important Notes

### Database Connection
- The server will try to connect to MongoDB using the URI in `.env`
- If MongoDB is not available, some features will use in-memory fallback
- Check console logs for connection status

### Environment Variables
Make sure your `.env` file contains:
```env
MONGO_URI=mongodb+srv://abhayabikramshahiofficial_db_user:IfxEIKhE4awXOIqh@cluster0.iw5alxz.mongodb.net/
PORT=5000
JWT_SECRET=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMn0.KMUFsIDTnFmyG3nMiGM6H9FNFUROf3wh7SmqJp-QV30
```

### Frontend Integration
- The backend is configured to work with the frontend at any origin (CORS enabled)
- Frontend should use `http://localhost:5000` as the base API URL for development
- For production, update the frontend's proxy to point to your deployed backend

## 🧪 Testing the API

### Register a User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "username": "testuser",
    "email": "test@gmail.com",
    "password": "password123"
  }'
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@gmail.com",
    "password": "password123"
  }'
```

### Get Profile (use the token from login response)
```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🛠️ Troubleshooting

### Server Won't Start
1. Check if port 5000 is already in use
2. Verify all dependencies are installed (`npm install`)
3. Check environment variables are set correctly

### Database Connection Issues
1. Verify MongoDB URI is correct
2. Check network connectivity
3. Server will run with in-memory fallback if DB is unavailable

### JWT Token Issues
1. Make sure JWT_SECRET is set in environment
2. Check token format in Authorization header: `Bearer <token>`
3. Tokens expire after 7 days

## 📁 Key Files
- `server.js` - Main server file
- `.env` - Environment configuration
- `models/` - Database schemas
- `routes/` - API endpoints
- `controllers/` - Business logic

## 🚀 Ready to Go!
Once the server is running, your Vauju dating app backend is ready to handle:
- User registration and authentication
- Real-time messaging
- Profile management
- Post creation and interaction
- Admin management
- File uploads

Happy coding! 💕
