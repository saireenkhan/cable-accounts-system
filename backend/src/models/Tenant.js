const mongoose = require('mongoose');

const tenantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    ownerEmail: { type: String, required: true, lowercase: true, trim: true },
    isActive: { type: Boolean, default: true },
    plan: { type: String, default: 'standard' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Tenant', tenantSchema);