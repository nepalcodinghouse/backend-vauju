import mongoose from "mongoose";
import User from "../models/User.js";
import dotenv from "dotenv";

dotenv.config();

const enablePostPermission = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    const email = "abhayabikramshahiofficial@gmail.com";
    
    const user = await User.findOne({ email });
    
    if (!user) {
      console.log(`❌ User with email ${email} not found`);
      process.exit(1);
    }

    // Enable post permission
    user.canPost = true;
    await user.save();

    console.log(`✅ Post permission enabled for ${email}`);
    console.log(`User ID: ${user._id}`);
    console.log(`Name: ${user.name}`);
    console.log(`Username: ${user.username}`);
    console.log(`Can Post: ${user.canPost}`);
    console.log(`Is Blue Tick: ${user.isBlueTick}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
};

enablePostPermission();