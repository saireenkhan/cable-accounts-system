require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const email = process.env.ADMIN_EMAIL || 'admin@cable.com';
    const password = process.env.ADMIN_PASSWORD || 'Admin@123';

    const existing = await User.findOne({ email });
    if (existing) {
      console.log(`ℹ️  User already exists: ${email}`);
      console.log('   Resetting password to match .env...');

      existing.password = password;
      existing.name = existing.name || 'Admin User';
      existing.role = 'admin';
      existing.isActive = true;
      await existing.save();

      console.log('✅ Password reset');
    } else {
      await User.create({
        name: 'Admin User',
        email,
        password,
        role: 'admin',
        isActive: true,
      });
      console.log(`✅ Admin user created: ${email}`);
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  }
})();