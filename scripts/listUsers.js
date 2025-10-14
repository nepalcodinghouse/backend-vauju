import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/User.js';

dotenv.config();

async function run() {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is not set in environment');
    process.exit(1);
  }
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const users = await User.find().select('name email visible');
    console.log(`Found ${users.length} users:`);
    users.forEach(u => console.log(u._id.toString(), '|', u.name, '|', u.email, '| visible=', u.visible));
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error listing users:', err);
    process.exit(1);
  }
}

run();
