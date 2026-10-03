const mongoose = require('mongoose');

const dealerAreaSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: false,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    // ISP this area belongs to (stored as ISP name)
    isp: {
      type: String,
      trim: true,
      default: '',
    },
    dealers: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

dealerAreaSchema.index({ tenantId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('DealerArea', dealerAreaSchema);