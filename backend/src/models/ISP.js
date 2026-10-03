const mongoose = require('mongoose');

const ispSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User', // Adjust if you have a dedicated Tenant model
    },
  },
  {
    timestamps: true,
  }
);

// Ensures name is unique only within the same tenant
ispSchema.index({ tenantId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('ISP', ispSchema);