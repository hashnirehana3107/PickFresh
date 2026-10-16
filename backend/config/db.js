const mongoose = require('mongoose');
const dns = require('dns');

// Ensure IPv4 resolution priority for Node.js network stack
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

const DEFAULT_ATLAS_URI = 'mongodb+srv://rehanahashni2001_db_user:r6CuFSozjBxMKGX9@cluster0.tm1cjxu.mongodb.net/pickfresh_db?retryWrites=true&w=majority';

const connectDB = async (retries = 3) => {
  mongoose.set('strictQuery', false);
  const uri = process.env.MONGODB_URI || DEFAULT_ATLAS_URI;
  console.log(' Connecting to MongoDB Atlas Cluster0...');

  while (retries > 0) {
    try {
      const conn = await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000,
        maxPoolSize: 50,
        minPoolSize: 10,
        socketTimeoutMS: 45000,
        family: 4
      });
      console.log(`✅ MongoDB Atlas Connected: ${conn.connection.host}`);
      return;
    } catch (error) {
      retries -= 1;
      console.error(`⚠️ MongoDB Connection Error: ${error.message}`);
      if (retries > 0) {
        console.log(`🔄 Retrying MongoDB connection... (${retries} attempts left)`);
        await new Promise(res => setTimeout(res, 2000));
      } else {
        console.warn('Note: Operating with local persistence fallback if MongoDB Atlas network IP is restricted.');
      }
    }
  }
};

module.exports = connectDB;
