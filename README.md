# Vauju Dating App Backend

A complete Node.js/Express backend for the Vauju dating application featuring real-time messaging, user matching, and comprehensive admin controls.

## 🚀 Features

### Core Features
- **User Authentication** - JWT-based auth with bcrypt password hashing
- **User Profiles** - Complete profile management with photo uploads
- **Real-time Messaging** - Socket.IO powered chat system
- **User Matching** - Smart matching algorithm with filters
- **Social Feed** - Create and interact with posts
- **Admin Panel** - Comprehensive user management system
- **Online Presence** - Real-time user online status

### Technical Features
- MongoDB with Mongoose ODM
- Socket.IO for real-time features
- File upload handling with Multer
- CORS enabled for cross-origin requests
- Environment-based configuration
- Comprehensive error handling
- Input validation and sanitization

## 🛠️ Installation

### Prerequisites
- Node.js (v14 or higher)
- MongoDB database
- Redis (optional, for advanced features)

### Setup Steps

1. **Clone and Navigate**
   ```bash
   cd backend-vauju
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   cp .env.example .env
   ```
   
   Update the `.env` file with your values:
   ```env
   MONGO_URI=mongodb://localhost:27017/vauju-dating
   JWT_SECRET=your-super-secret-jwt-key
   PORT=5000
   ADMIN_USER=admin
   ADMIN_PASS=secure-admin-password
   ADMIN_TOKEN=static-admin-token
   ```

4. **Start the Server**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## 📡 API Endpoints

### Authentication (`/api/auth`)
- `POST /register` - User registration
- `POST /login` - User login
- `GET /me` - Get current user info
- `GET /user` - Get user profile
- `GET /user/me` - Alternative user profile endpoint

### User Management (`/api/users`)
- `GET /me` - Get current user
- `GET /:id` - Get user by ID
- `GET /@:username` - Get user by username

### Profile Management (`/api/profile`)
- `GET /` - Get user profile
- `PUT /` - Update user profile
- `POST /upload` - Upload profile picture
- `GET /matches` - Get potential matches
- `GET /messages-users` - Get users for messaging

### Messaging (`/api/messages`)
- `POST /send` - Send a message
- `GET /conversation/:userId` - Get conversation with user
- `PUT /seen/:messageId` - Mark message as seen
- `POST /heartbeat` - Update online presence
- `GET /online-users` - Get online users list
- `DELETE /delete-for-me/:messageId` - Delete message for current user
- `POST /unsend/:messageId` - Unsend a message

### Posts/Feed (`/api/posts`)
- `GET /` - Get all posts (feed)
- `POST /` - Create new post
- `GET /:id` - Get specific post
- `PUT /:id` - Update post (author only)
- `DELETE /:id` - Delete post (author only)
- `POST /:id/like` - Like a post
- `DELETE /:id/like` - Unlike a post
- `POST /:id/comments` - Add comment
- `DELETE /:postId/comments/:commentId` - Delete comment

### Admin Panel (`/admin`)
- `POST /login` - Admin authentication
- `GET /users` - List all users (with search)
- `GET /pending-visibility` - Users pending approval
- `POST /approve-visibility/:userId` - Approve user visibility
- `POST /verify/:userId` - Verify/unverify user
- `POST /suspend/:userId` - Suspend/unsuspend user
- `DELETE /users/:userId` - Delete user

## 🔌 Socket.IO Events

### Client to Server
- `authenticate` - Authenticate socket with JWT
- `joinRoom` - Join a chat room
- `leaveRoom` - Leave a chat room
- `typing` - Send typing indicator
- `heartbeat` - Update online presence

### Server to Client
- `authSuccess` - Authentication successful
- `authError` - Authentication failed
- `message` - New message received
- `seen` - Message marked as seen
- `presence` - User online/offline status
- `typing` - Typing indicator

## 📁 Project Structure

```
backend-vauju/
├── config/
│   └── db.js                 # Database configuration
├── controllers/
│   ├── authController.js     # Authentication logic
│   ├── userController.js     # User management
│   ├── profileController.js  # Profile management
│   ├── messageController.js  # Messaging system
│   ├── postController.js     # Posts/feed system
│   └── adminController.js    # Admin functions
├── middleware/
│   └── auth.js              # JWT authentication middleware
├── models/
│   ├── User.js              # User model
│   ├── Message.js           # Message model
│   └── Post.js              # Post model
├── routes/
│   ├── authRoutes.js        # Auth endpoints
│   ├── userRoutes.js        # User endpoints
│   ├── profileRoutes.js     # Profile endpoints
│   ├── messageRoutes.js     # Message endpoints
│   ├── postRoutes.js        # Post endpoints
│   └── adminRoutes.js       # Admin endpoints
├── uploads/                 # Uploaded files storage
├── .env                     # Environment variables
├── server.js                # Main server file
└── package.json            # Dependencies and scripts
```

## 🔐 Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

Tokens are generated on successful login/registration and expire after 7 days.

## 📝 User Model Schema

```javascript
{
  name: String (required),
  username: String (required, unique),
  email: String (validated),
  password: String (hashed),
  bio: String,
  age: Number,
  gender: String (male/female/other),
  interests: Array of Strings,
  location: String,
  profileImage: String,
  visible: Boolean,
  visibilityRequested: Boolean,
  visibilityApproved: Boolean,
  isVerified: Boolean,
  suspended: Boolean,
  isBlueTick: Boolean (auto-assigned for VIP emails),
  timestamps: true
}
```

## 🔄 Real-time Features

The backend includes comprehensive real-time features:

- **Live messaging** with delivery confirmations
- **Typing indicators** in conversations
- **Online presence** tracking
- **Message read receipts**
- **Connection status** updates

## 🛡️ Security Features

- **JWT Authentication** with secure token generation
- **Password Hashing** using bcrypt with salt
- **Input Validation** and sanitization
- **Rate Limiting** on sensitive endpoints
- **CORS Configuration** for secure cross-origin requests
- **File Upload Security** with type and size validation

## 🔧 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MONGO_URI` | MongoDB connection string | Required |
| `JWT_SECRET` | Secret key for JWT signing | Required |
| `PORT` | Server port | 5000 |
| `ADMIN_USER` | Admin username | admin |
| `ADMIN_PASS` | Admin password | admin123 |
| `ADMIN_TOKEN` | Static admin token | static-admin-token |

## 🚦 Development

### Running in Development
```bash
npm run dev
```

### Database Seeding
```bash
node scripts/listUsers.js  # List all users
```

### Testing API Endpoints
The server includes a test endpoint at `/api` that returns the server status.

## 🐳 Deployment

### Using PM2
```bash
npm install -g pm2
pm2 start server.js --name "vauju-backend"
```

### Using Docker
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

## 📊 Monitoring

The server includes comprehensive logging:
- Connection events
- Authentication attempts
- Error tracking
- Socket.IO events
- Database operations

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Check the logs for detailed error messages
- Ensure all environment variables are properly configured

---

**Happy Dating! 💕**
