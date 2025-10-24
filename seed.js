// backend/seed.js
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import User from "./models/User.js";
import Match from "./models/Match.js";

dotenv.config();

mongoose.connect(process.env.MONGODB_URI, { 
  useNewUrlParser: true, 
  useUnifiedTopology: true 
})
  .then(async () => {
    console.log("Connected to MongoDB...");

    // Clear old data
    await User.deleteMany({});
    await Match.deleteMany({});

    // Create test user
    const hashedPassword = await bcrypt.hash("password123", 10);
    const user = new User({ 
      email: "test@example.com", 
      password: hashedPassword 
    });
    await user.save();

    // Seed matches (with email + genuine tracking)
    await Match.insertMany([
      { 
        name: "Match 1", 
        age: 25, 
        gender: "Male", 
        interests: ["Sports"], 
        email: "match1@example.com", 
        isGenuine: false,
        userId: user._id 
      },
      { 
        name: "Match 2", 
        age: 30, 
        gender: "Female", 
        interests: ["Travel"], 
        email: "abhayabikramshahiofficial@gmail.com", // ✅ genuine one
        isGenuine: true,
        userId: user._id 
      },
    ]);

    console.log("✅ Database seeded successfully!");
    mongoose.connection.close();
  })
  .catch((err) => console.error("❌ Seeding error:", err));
