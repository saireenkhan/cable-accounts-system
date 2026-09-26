const mongoose = require('mongoose');

const PartnerPaymentSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: false,
    index: true,
  },
  receiptNo: {
    type: String,
    required: true,
    unique: true,
  },
  partner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Partner',
    required: true,
  },
  month: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    default: 0,
  },
  packagePrice: {
    type: Number,
    default: 0,
  },
  paymentDate: {
    type: Date,
    default: Date.now,
  },
  paymentMethod: {
    type: String,
    default: 'cash',
  },
  receivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  remarks: {
    type: String,
    default: '',
  },
  isNoPayment: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

// ✅ Prevent duplicate payment for same partner + same month
PartnerPaymentSchema.index(
  { partner: 1, month: 1 },
  {
    unique: true,
    partialFilterExpression: { isNoPayment: false },
  }
);

module.exports = mongoose.model('PartnerPayment', PartnerPaymentSchema);