import mongoose from "mongoose";

let _connected = false;

const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      console.warn('MONGO_URI not set — running in in-memory dev mode');
      _connected = false;
      return;
    }
    await mongoose.connect(process.env.MONGO_URI);
    console.log("🟢 Server: MongoDB Connected");
    _connected = true;
  } catch (err) {
    console.error("❌ MongoDB Connection Failed:", err.message);
    console.warn('Continuing in in-memory dev mode');
    _connected = false;
    // Do not exit — allow the server to run in a dev fallback mode
  }
};

export default connectDB; // default export
export const isDbConnected = () => _connected;
