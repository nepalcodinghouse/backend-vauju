# Cloudinary Setup Guide for Vauju Dating App Backend

## Overview
The backend now supports Cloudinary for cloud-based image storage with automatic fallback to local storage if Cloudinary is not configured.

## Prerequisites
1. Node.js v16+
2. npm v8+
3. MongoDB connection
4. (Optional) Cloudinary account for image uploads

---

## Setup Instructions

### Step 1: Install Dependencies

```bash
cd backend-vauju

# Install all dependencies including cloudinary
npm install
```

This will install the cloudinary package along with all other dependencies.

### Step 2: Configure Environment Variables

Create a `.env` file in the `backend-vauju` directory:

```bash
cp .env.example .env
```

Edit `.env` with your actual values:

```env
# Server Port
PORT=5000

# MongoDB Connection String
MONGODB_URI=mongodb://localhost:27017/vauju-dating-app

# JWT Secret (MUST be changed in production!)
JWT_SECRET=your_super_secret_jwt_key_here_change_this_in_production

# Cloudinary Configuration (OPTIONAL - if not set, uses local storage)
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Environment
NODE_ENV=development
```

### Step 3: Get Cloudinary Credentials (Optional)

To use Cloudinary for image uploads:

1. Go to [https://cloudinary.com/](https://cloudinary.com/)
2. Sign up for a free account
3. Navigate to Dashboard
4. Copy your credentials:
   - Cloud Name
   - API Key
   - API Secret
5. Paste them in your `.env` file

**Note:** Free Cloudinary account includes:
- 25GB of storage
- Unlimited bandwidth
- Automatic image optimization
- CDN delivery

### Step 4: Start the Backend Server

```bash
# For production
npm start

# For development with auto-reload
npm run dev
```

**Expected Output:**
```
AuraMeet backend running on port 5000
JWT_SECRET loaded: true
✅ All configurations verified
```

---

## Features

### Automatic Image Optimization
When using Cloudinary:
- Images are automatically optimized for web
- Multiple formats support (WebP, AVIF, etc.)
- Responsive sizing
- Quality auto-adjustment based on device

### Fallback to Local Storage
If Cloudinary is not configured:
- Images are stored in `/uploads` directory
- Server serves static files at `http://localhost:5000/uploads/`
- No external dependencies required
- Good for development/testing

### Smart Storage Selection
```javascript
// Cloudinary (if configured)
POST /api/profile/upload → Cloudinary + Database

// Local Storage (fallback)
POST /api/profile/upload → /uploads directory + Database

// Delete
DELETE /api/profile/upload/:publicId → Removes from Cloudinary or local
```

---

## API Endpoints

### Upload Profile Picture
```
POST /api/profile/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

body: {
  profilePic: <image_file>
}

Response (Cloudinary):
{
  success: true,
  url: "https://res.cloudinary.com/...",
  publicId: "vauju-dating-app/profile-pictures/...",
  message: "Profile picture updated successfully!",
  user: { ... }
}

Response (Local Storage):
{
  success: true,
  url: "/uploads/userId_timestamp.jpg",
  message: "Profile picture updated successfully (local storage)!",
  user: { ... }
}
```

### Delete Profile Picture
```
DELETE /api/profile/upload/:publicId
Authorization: Bearer <token>

Response:
{
  success: true,
  message: "Profile picture deleted successfully!"
}
```

---

## Troubleshooting

### Error: "Cloudinary not configured"
**Solution:** Ensure all three environment variables are set:
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

Or remove them to use local storage fallback.

### Error: "No file uploaded"
**Solution:**
- Check file size < 5MB
- Ensure Content-Type is `multipart/form-data`
- Verify file is a valid image format

### Error: "Invalid token"
**Solution:**
- Check Authorization header format: `Bearer <token>`
- Ensure token is not expired
- Verify JWT_SECRET matches between login and upload

### Local uploads not visible
**Solution:**
- Ensure `/uploads` directory is created
- Check file permissions
- Verify static file serving is enabled in server.js

---

## Development Workflow

### 1. With Cloudinary (Recommended)
```bash
# Set all Cloudinary env variables
npm run dev

# Images uploaded to cloud, optimized delivery
# No local storage needed
```

### 2. Without Cloudinary (For Testing)
```bash
# Remove/Comment out Cloudinary env variables
npm run dev

# Images saved locally to /uploads
# Perfect for development without internet
```

### 3. Mixed Mode (Testing Fallback)
```bash
# Set Cloudinary env but don't have internet
# Server automatically falls back to local storage
npm run dev
```

---

## Security Considerations

1. ✅ JWT_SECRET must be strong and unique
2. ✅ Never commit `.env` file to git (use `.gitignore`)
3. ✅ Cloudinary credentials are API-only (not secret key)
4. ✅ File size limits prevent abuse (5MB default)
5. ✅ Authentication required for all upload operations
6. ✅ Files organized in user folders for privacy

---

## Performance Tips

### For Cloudinary
- Images are automatically CDN-delivered
- Compression happens server-side
- Lazy loading recommended on frontend
- Use image transformations for thumbnails

### For Local Storage
- Images stored locally
- Serve through Express static middleware
- Consider adding caching headers
- Monitor disk space usage

---

## Next Steps

1. ✅ Install dependencies: `npm install`
2. ✅ Copy `.env.example` to `.env`
3. ✅ Fill in credentials (at least JWT_SECRET and MongoDB_URI)
4. ✅ Start server: `npm start` or `npm run dev`
5. ✅ Test upload endpoint from frontend

---

## Support

For issues or questions:
1. Check console logs for detailed error messages
2. Verify all environment variables are set
3. Ensure backend is running on port 5000
4. Check frontend is pointing to `http://localhost:5000`

---

**Version:** 1.0.0
**Last Updated:** 2025-11-03
**Status:** Production Ready ✅
