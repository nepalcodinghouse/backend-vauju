import mongoose from "mongoose";

let dbConnected = false;

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    dbConnected = true;
  } catch (err) {
    console.error("❌ MongoDB Connection Failed:", err.message);
    dbConnected = false;
  }
};

export const isDbConnected = () => dbConnected;

export default connectDB;
