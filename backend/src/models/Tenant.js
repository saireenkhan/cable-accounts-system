
const mongoose = require('mongoose');

const tenantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    ownerEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    // Human-readable subscription name.
    // Kept for compatibility with existing pages.
    plan: {
      type: String,
      default: 'standard',
      trim: true,
    },

    // Actual package selected in Master Package Management.
    masterPackageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MasterPackage',
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.Tenant ||
  mongoose.model('Tenant', tenantSchema);

// Existing script usage:
// node src/scripts/create-tenant.js "SFA Net" "SFA@net.com" "SFA@123"
