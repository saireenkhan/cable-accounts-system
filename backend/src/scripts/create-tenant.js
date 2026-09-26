/**
 * create-tenant.js
 * Creates a new Tenant + admin User.
 *
 * Usage:
 *   node src/scripts/create-tenant.js "Company B" "admin-b@example.com" "StrongPass123"
 */

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const User = require('../models/User');
const Tenant = require('../models/Tenant');

const slugify = (s) =>
  String(s)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const run = async () => {
  const tenantName = process.argv[2];
  const email = process.argv[3];
  const password = process.argv[4];

  if (!tenantName || !email || !password) {
    console.error('❌ Usage: node src/scripts/create-tenant.js "Company B" "admin-b@example.com" "StrongPass123"');
    process.exit(1);
  }

  if (password.length < 6) {
    console.error('❌ Password must be at least 6 characters');
    process.exit(1);
  }

  await connectDB();

  const emailLower = email.toLowerCase().trim();

  const existing = await User.findOne({ email: emailLower });
  if (existing) {
    console.error(`❌ A user already exists with email: ${emailLower}`);
    process.exit(1);
  }

  const slug = slugify(tenantName) + '-' + Date.now().toString(36);
  const tenant = await Tenant.create({
    name: tenantName.trim(),
    slug,
    ownerEmail: emailLower,
    isActive: true,
    plan: 'standard',
  });

  const admin = await User.create({
    name: tenantName.trim() + ' Admin',
    email: emailLower,
    password,
    role: 'admin',
    tenantId: tenant._id,
    isActive: true,
  });

  console.log('✅ Tenant + Admin created');
  console.log(`   Tenant:  ${tenant.name}`);
  console.log(`   ID:      ${tenant._id}`);
  console.log(`   Slug:    ${tenant.slug}`);
  console.log(`   Admin:   ${admin.email} (${admin._id})`);
  console.log('');
  console.log('Login with:');
  console.log(`   Email:    ${emailLower}`);
  console.log(`   Password: ${password}`);

  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error('❌ Creation failed:', err);
  process.exit(1);
});