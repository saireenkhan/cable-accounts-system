const mongoose = require('mongoose');
const logger = require('../utils/logger');

// ✅ Cache the connection across serverless invocations
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
  if (cached.conn) {
    return cached.conn;
  }

  if (!process.env.MONGODB_URI) {
    logger.warn('⚠️ MONGODB_URI not set — skipping DB connection');
    return null;
  }

  if (!cached.promise) {
 const opts = {
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  maxPoolSize: 10,
  minPoolSize: 1,
  bufferCommands: true,
  bufferTimeoutMS: 10000, // wait up to 10s for connection instead of failing instantly
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