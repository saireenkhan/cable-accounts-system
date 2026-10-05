// models/Promise.js
const mongoose = require('mongoose');

const PromiseSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: false,
      index: true,
    },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true,
    },

    customerName: { type: String, required: true, trim: true },
    customerId: { type: String, trim: true },

    promiseAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    promiseDate: {
      type: Date,
      required: true,
    },

    paymentMethod: {
      type: String,
      enum: ['Cash', 'JazzCash', 'EasyPaisa', 'Bank Transfer', 'Other'],
      default: 'Cash',
    },

    recoveryOfficer: {
      type: String,
      trim: true,
    },

    promiseSource: {
      type: String,
      enum: ['Phone Call', 'WhatsApp', 'SMS', 'Visit', 'Other'],
      default: 'Phone Call',
    },

    remarks: {
      type: String,
      trim: true,
      default: '',
    },

    status: {
      type: String,
      enum: ['Today', 'Upcoming', 'Kept', 'Broken'],
      default: 'Upcoming',
      index: true,
    },
  },
  { timestamps: true }
);

PromiseSchema.index({ tenantId: 1, promiseDate: -1 });
PromiseSchema.index({ tenantId: 1, status: 1 });

module.exports = mongoose.model('Promise', PromiseSchema);