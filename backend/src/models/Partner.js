const mongoose = require('mongoose');

const partnerSchema = new mongoose.Schema(
  {
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: false,
    index: true,
  },
    partnerId: {
      type: String,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
    },
    activationDate: {
      type: Date,
    },
    expiryDate: {
      type: Date,
    },
    cnic: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      required: true,
    },
    // ✅ Area stored as string (matches PartnerArea.name for easy counting)
    area: {
      type: String,
      trim: true,
      default: '',
    },
    package: {
      type: String,
    },
    monthlyFee: {
      type: Number,
      default: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
        partner: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended', 'expired'],
      default: 'active',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);


partnerSchema.index({ tenantId: 1, partnerId: 1 }, { unique: true });

module.exports = mongoose.model('Partner', partnerSchema);