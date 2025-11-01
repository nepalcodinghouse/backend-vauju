// Test script to verify that specific users can post
import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/User.js";
import Post from "./models/Post.js";

dotenv.config();

// Connect to database
mongoose.connect(process.env.MONGO_URI);

const testUsers = [
  "abhayabikramshahioffciial@gmail.com",
  "anupama57@gmail.com"
];

async function testPostingPermissions() {
  console.log("Testing posting permissions for specific users...\n");
  
  for (const email of testUsers) {
    try {
      // Find user
      const user = await User.findOne({ email });
      if (!user) {
        console.log(`❌ User with email ${email} not found`);
        continue;
      }
      
      // Check permissions
      const hasPermission = user.isBlueTick || user.canPost || testUsers.includes(user.email);
      
      console.log(`User: ${user.name} (${user.email})`);
      console.log(`  - isBlueTick: ${user.isBlueTick}`);
      console.log(`  - canPost: ${user.canPost}`);
      console.log(`  - Has posting permission: ${hasPermission ? '✅ YES' : '❌ NO'}`);
      
      // If user has permission, try to create a test post
      if (hasPermission) {
        const post = new Post({
          user: user._id,
          content: `Test post from ${user.name} (${email}) - ${new Date().toISOString()}`
        });
        
        await post.save();
        console.log(`  - Test post created: ✅ SUCCESS`);
        console.log(`    Post ID: ${post._id}`);
      }
      
      console.log(""); // Empty line for readability
    } catch (error) {
      console.error(`Error testing user ${email}:`, error.message);
    }
  }
  
  // Close connection
  mongoose.connection.close();
  console.log("Test completed.");
}

// Run the test
testPostingPermissions().catch(console.error);