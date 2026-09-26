/**
 * migrate-tag-tenant.js
 *
 * Tags all pre-existing documents with the tenantId of the "main" tenant
 * (Fusion Net). Only touches documents that currently have no tenantId.
 *
 * Safe: idempotent (running twice = 0 changes the second time).
 *
 * Usage:
 *   node src/scripts/migrate-tag-tenant.js --dry-run   # count only
 *   node src/scripts/migrate-tag-tenant.js             # apply
 */

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const Tenant = require('../models/Tenant');

// The tenant that owns all pre-existing data.
// Look it up by ownerEmail to avoid hardcoding ObjectIds.
const OWNER_EMAIL = 'admin@cable.com';

const DRY_RUN = process.argv.includes('--dry-run');

// Mongoose collection names may differ from model file names.
// We derive them from the mongoose models themselves to be safe.
const MODELS = [
  'Area',
  'Attendance',
  'Bill',
  'Customer',
  'Dealer',
  'DealerArea',
  'DealerPayment',
  'Expense',
  'InstallationCharge',
  'Package',
  'Partner',
  'PartnerArea',
  'PartnerList',
  'PartnerPayment',
  'Payment',
  'Purchase',
  'Staff',
  'WhatsAppConfig',
  'WhatsAppMessage',
  'WhatsAppSession',
];

async function run() {
  await connectDB();

  // 1. Find the tenant
  const tenant = await Tenant.findOne({ ownerEmail: OWNER_EMAIL });
  if (!tenant) {
    console.error(`❌ No tenant found with ownerEmail: ${OWNER_EMAIL}`);
    process.exit(1);
  }

  const tenantId = tenant._id;
  console.log(`\n${DRY_RUN ? '🔍 DRY RUN' : '🚀 TAGGING'}`);
  console.log(`   Tenant: ${tenant.name}`);
  console.log(`   ID:     ${tenantId}\n`);

  let total = 0;

  for (const modelName of MODELS) {
    let Model;
    try {
      Model = require(`../models/${modelName}`);
    } catch (e) {
      console.log(`⚠️  Skipped ${modelName}: cannot load model (${e.message})`);
      continue;
    }

    // Match documents missing tenantId OR with tenantId: null
    const filter = {
      $or: [
        { tenantId: { $exists: false } },
        { tenantId: null },
      ],
    };

    const count = await Model.countDocuments(filter);

    if (DRY_RUN) {
      console.log(`   ${modelName.padEnd(22)} would update: ${count}`);
      total += count;
      continue;
    }

    if (count === 0) {
      console.log(`   ${modelName.padEnd(22)} nothing to update`);
      continue;
    }

    const result = await Model.updateMany(filter, { $set: { tenantId } });
    console.log(`   ${modelName.padEnd(22)} updated: ${result.modifiedCount}`);
    total += result.modifiedCount;
  }

  console.log(`\n${DRY_RUN ? '📋 Dry run complete.' : '✨ Migration complete.'}`);
  console.log(`   Total documents ${DRY_RUN ? 'to update' : 'updated'}: ${total}\n`);

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});