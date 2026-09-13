const mongoose = require('mongoose');
const logger = require('../utils/logger');

// ✅ Cache the connection across serverless invocations
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
  // ✅ Check if cached connection is actually healthy
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  // ✅ Reset stale connection so we force a fresh connect
  if (cached.conn && mongoose.connection.readyState !== 1) {
    console.log('🔄 Stale connection detected, reconnecting...');
    cached.conn = null;
    cached.promise = null;
  }

  if (!process.env.MONGODB_URI) {
    logger.warn('⚠️ MONGODB_URI not set — skipping DB connection');
    return null;
  }

  if (!cached.promise) {
    const opts = {
      serverSelectionTimeoutMS: 30000, // ✅ 30s — enough for cold-start reconnect on Vercel
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 1,
      // ✅ Removed bufferCommands/bufferTimeoutMS — Mongoose defaults work better on serverless
    };

    cached.promise = mongoose
      .connect(process.env.MONGODB_URI, opts)
      .then((m) => {
        logger.info(`✅ MongoDB Connected: ${m.connection.host}`);
        return m;
      })
      .catch((err) => {
        logger.error(`❌ MongoDB connection error: ${err.message}`);
        cached.promise = null; // ✅ reset so next request retries
        throw err;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    throw err;
  }

  return cached.conn;
};

// ✅ Connection event listeners — only log, never crash the process
mongoose.connection.on('disconnected', () => {
  logger.warn('⚠️ MongoDB disconnected, will reconnect on next request');
});

mongoose.connection.on('reconnected', () => {
  logger.info('✅ MongoDB reconnected');
});

mongoose.connection.on('error', (err) => {
  logger.error(`❌ MongoDB connection error event: ${err.message}`);
});

module.exports = connectDB;