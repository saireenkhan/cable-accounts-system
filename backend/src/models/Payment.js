const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  receiptNo: {
    type: String,
    required: true,
    unique: true,
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
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

// ✅ Prevent duplicate payment for same customer + same month
// (Partial filter — allows multiple "no payment" markers per month if needed)
PaymentSchema.index(
  { customer: 1, month: 1 },
  {
    unique: true,
    partialFilterExpression: { isNoPayment: false },
  }
);

module.exports = mongoose.model('Payment', PaymentSchema);