const mongoose = require('mongoose');

// ✅ Password is URL-encoded: Cable%402026
const uri = 'mongodb://saireenfatimakhan_db_user:Cable%402026@ac-wofqtyj-shard-00-00.9f1a3ua.mongodb.net:27017,ac-wofqtyj-shard-00-01.9f1a3ua.mongodb.net:27017,ac-wofqtyj-shard-00-02.9f1a3ua.mongodb.net:27017/cable_db?ssl=true&replicaSet=atlas-atrt2l-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0';

console.log('🔄 Testing connection to MongoDB Atlas...');

mongoose.connect(uri, {
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
})
.then(() => {
  console.log('✅ Connected to MongoDB Atlas successfully!');
  console.log('📊 Database:', mongoose.connection.db.databaseName);
  process.exit(0);
})
.catch((err) => {
  console.error('❌ Connection error:', err.message);
  process.exit(1);
});