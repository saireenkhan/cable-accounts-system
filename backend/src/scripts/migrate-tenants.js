/**
 * migrate-tenants.js
 * Creates a Tenant for an existing admin and backfills tenantId.
 *
 * Usage:
 *   node src/scripts/migrate-tenants.js "Company Name" admin@email.com
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
  const tenantName = process.argv[2] || 'Default Tenant';
  const adminEmail = process.argv[3];

  if (!adminEmail) {
    console.error('❌ Usage: node src/scripts/migrate-tenants.js "Company Name" admin@email.com');
    process.exit(1);
  }

  await connectDB();

  const admin = await User.findOne({ email: adminEmail.toLowerCase().trim() });
  if (!admin) {
    console.error(`❌ No user found with email: ${adminEmail}`);
    process.exit(1);
  }

  if (admin.tenantId) {
    const existing = await Tenant.findById(admin.tenantId);
    console.log(`ℹ️  Admin already linked to tenant: ${existing?.name} (${admin.tenantId})`);
    process.exit(0);
  }

  const slug = slugify(tenantName) + '-' + Date.now().toString(36);
  const tenant = await Tenant.create({
    name: tenantName.trim(),
    slug,
    ownerEmail: admin.email,
    isActive: true,
    plan: 'standard',
  });

  admin.tenantId = tenant._id;
  await admin.save();

  console.log('✅ Migration complete');
  console.log(`   Tenant:  ${tenant.name}`);
  console.log(`   ID:      ${tenant._id}`);
  console.log(`   Slug:    ${tenant.slug}`);
  console.log(`   Admin:   ${admin.email} (${admin._id})`);

  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});