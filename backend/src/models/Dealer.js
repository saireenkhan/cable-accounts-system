const mongoose = require('mongoose');

const dealerSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: false,
      index: true,
    },
    dealerId: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    cellNo: {
      type: String,
      required: true,
      trim: true,
    },
    // ISP stored as string (matches ISP name)
    isp: {
      type: String,
      trim: true,
      default: '',
    },
    area: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Area',
    },
    address: {
      type: String,
      trim: true,
    },
    remarks: {
      type: String,
      trim: true,
    },
    openingBalance: {
      type: Number,
      default: 0,
    },
    currentBalance: {
      type: Number,
      default: 0,
    },
    commission: {
      type: String,
      enum: ['5%', '10%', '15%', '20%', '25%', '30%', '35%', '40%', '50%'],
      default: '10%',
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
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

dealerSchema.index({ tenantId: 1, dealerId: 1 }, { unique: true });

module.exports = mongoose.model('Dealer', dealerSchema);