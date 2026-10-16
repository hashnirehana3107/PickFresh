const mongoose = require('mongoose');
const dns = require('dns');

// Ensure IPv4 resolution priority for Node.js network stack
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

const DEFAULT_ATLAS_URI = 'mongodb+srv://rehanahashni2001_db_user:r6CuFSozjBxMKGX9@cluster0.tm1cjxu.mongodb.net/pickfresh_db?retryWrites=true&w=majority';

// Global cache for active connection and in-flight connection promise across Express and Serverless (Vercel)
let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async (retries = 3) => {
  // 1. If already fully connected, return active connection immediately
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  // 2. If connection is already in progress, await it
  if (mongoose.connection.readyState === 2) {
    if (cached.promise) {
      try {
        await cached.promise;
        if (mongoose.connection.readyState === 1) return mongoose.connection;
      } catch (err) {
        cached.promise = null;
      }
    }
    try {
      if (mongoose.connection.asPromise) {
        await mongoose.connection.asPromise();
        if (mongoose.connection.readyState === 1) return mongoose.connection;
      }
    } catch (err) {}
  }

  // 3. If a cached connection attempt is already in flight, await it
  if (cached.promise) {
    try {
      await cached.promise;
      if (mongoose.connection.readyState === 1) {
        return mongoose.connection;
      }
    } catch (err) {
      cached.promise = null;
    }
  }

  mongoose.set('strictQuery', false);
  mongoose.set('bufferTimeoutMS', 25000);
  const uri = process.env.MONGODB_URI || DEFAULT_ATLAS_URI;

  cached.promise = (async () => {
    let lastErr = null;
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`🔌 Connecting to MongoDB Atlas (Attempt ${attempt}/${retries})...`);
        const conn = await mongoose.connect(uri, {
          serverSelectionTimeoutMS: 8000,
          connectTimeoutMS: 10000,
          maxPoolSize: 10,
          minPoolSize: 0,
          socketTimeoutMS: 45000,
          family: 4
        });
        console.log(`✅ MongoDB Atlas Connected: ${conn.connection.host}`);
        cached.conn = conn.connection;
        return conn.connection;
      } catch (error) {
        lastErr = error;
        console.error(`⚠️ MongoDB Connection Error (attempt ${attempt}): ${error.message}`);
        if (attempt < retries) {
          console.log(`🔄 Retrying MongoDB connection in 1.5s... (${retries - attempt} attempts left)`);
          await new Promise(res => setTimeout(res, 1500));
        }
      }
    }
    cached.promise = null;
    throw lastErr || new Error('Failed to connect to MongoDB Atlas');
  })();

  try {
    const conn = await cached.promise;
    return conn;
  } catch (err) {
    cached.promise = null;
    throw err;
  }
};

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ MongoDB disconnected.');
  if (cached) {
    cached.conn = null;
    cached.promise = null;
  }
});

mongoose.connection.on('error', (err) => {
  console.error('⚠️ MongoDB connection error:', err.message);
  if (cached) {
    cached.conn = null;
    cached.promise = null;
  }
});

module.exports = connectDB;
