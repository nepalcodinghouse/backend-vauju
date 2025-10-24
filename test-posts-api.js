/**
 * POST API TEST GUIDE
 * 
 * This guide explains how to test the new post functionality
 */

const API_URL = "https://backend-vauju-1.onrender.com"; // Change to your backend URL
// For local testing: const API_URL = "http://localhost:5000";

console.log(`
╔════════════════════════════════════════════════════════════╗
║          POST API TESTING GUIDE                            ║
╚════════════════════════════════════════════════════════════╝

✅ ENDPOINTS AVAILABLE:

1️⃣  GET /api/posts
   - Get all posts from the feed (public, no auth required)
   - Query params: ?page=1&limit=10
   - Example: ${API_URL}/api/posts?page=1&limit=10

2️⃣  GET /api/posts/user/:userId
   - Get all posts by a specific user (public, no auth required)
   - Query params: ?page=1&limit=10
   - Example: ${API_URL}/api/posts/user/USER_ID_HERE?page=1&limit=10

3️⃣  POST /api/posts
   - Create a new post (REQUIRES AUTHENTICATION & canPost permission)
   - Headers: { "x-user-id": "YOUR_JWT_TOKEN" }
   - Body: { "content": "Your post text here (max 500 chars)" }
   - Requires: User must have canPost = true (auto-enabled for blue-tick users)

4️⃣  GET /api/posts/:postId
   - Get a specific post details (protected)
   - Headers: { "x-user-id": "YOUR_JWT_TOKEN" }

5️⃣  PUT /api/posts/:postId
   - Update your own post (protected)
   - Headers: { "x-user-id": "YOUR_JWT_TOKEN" }
   - Body: { "content": "Updated post text" }

6️⃣  DELETE /api/posts/:postId
   - Delete your own post (protected)
   - Headers: { "x-user-id": "YOUR_JWT_TOKEN" }

7️⃣  POST /api/posts/:postId/like
   - Like a post (protected)
   - Headers: { "x-user-id": "YOUR_JWT_TOKEN" }

8️⃣  DELETE /api/posts/:postId/like
   - Unlike a post (protected)
   - Headers: { "x-user-id": "YOUR_JWT_TOKEN" }

9️⃣  POST /api/posts/:postId/comments
   - Add comment to a post (protected)
   - Headers: { "x-user-id": "YOUR_JWT_TOKEN" }
   - Body: { "content": "Your comment text" }

🟠 POST /api/posts/:postId/comments/:commentId
   - Delete a comment (protected)
   - Headers: { "x-user-id": "YOUR_JWT_TOKEN" }

╔════════════════════════════════════════════════════════════╗
║  PERMISSION SETUP FOR abhayabikramshahiofficial@gmail.com  ║
╚════════════════════════════════════════════════════════════╝

✅ Auto-enabled:
   - Users registering with this email AUTOMATICALLY get:
     - isBlueTick = true
     - canPost = true
   
✅ Manual enable (for existing users):
   - Run: node backend-vauju/scripts/enablePostPermission.js

╔════════════════════════════════════════════════════════════╗
║  TESTING WITH CURL/POSTMAN                                 ║
╚════════════════════════════════════════════════════════════╝

1. CREATE A POST:
   curl -X POST ${API_URL}/api/posts \\
     -H "Content-Type: application/json" \\
     -H "x-user-id: YOUR_JWT_TOKEN" \\
     -d '{"content": "Hello world from my post!"}'

2. GET POSTS BY USER:
   curl -X GET "${API_URL}/api/posts/user/USER_ID_HERE?page=1&limit=10"

3. GET ALL POSTS:
   curl -X GET "${API_URL}/api/posts?page=1&limit=10"

4. LIKE A POST:
   curl -X POST ${API_URL}/api/posts/POST_ID_HERE/like \\
     -H "x-user-id: YOUR_JWT_TOKEN"

5. ADD COMMENT:
   curl -X POST ${API_URL}/api/posts/POST_ID_HERE/comments \\
     -H "Content-Type: application/json" \\
     -H "x-user-id: YOUR_JWT_TOKEN" \\
     -d '{"content": "Great post!"}'

╔════════════════════════════════════════════════════════════╗
║  TROUBLESHOOTING                                           ║
╚════════════════════════════════════════════════════════════╝

❌ Error: "You don't have permission to create posts"
   → Solution: Make sure user has canPost = true
   → Run the enable script or register with blue-tick email

❌ Error: "Post content is required"
   → Solution: Add "content" field to request body

❌ Error: "Post content cannot exceed 500 characters"
   → Solution: Keep post under 500 characters

❌ Error: 401 Unauthorized
   → Solution: Check if x-user-id header has valid JWT token

❌ Error: 404 User not found
   → Solution: When getting user posts, verify USER_ID exists

`);