const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
  {
    customerId: {
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

module.exports = mongoose.model('Customer', customerSchema);