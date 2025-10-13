import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) {
      console.error("❌ MONGO_URI is not set in environment variables");
      process.exit(1);
    }
    await mongoose.connect(uri, {
      // increase timeout so Atlas cold starts don't fail quickly
      serverSelectionTimeoutMS: 15000,
    });
    console.log("✅ MongoDB Connected");
  } catch (err) {
    console.error("❌ MongoDB Connection Failed:", err);
    process.exit(1);
  }
};

export default connectDB;