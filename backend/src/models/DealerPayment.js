const mongoose = require('mongoose');

const dealerPaymentSchema = new mongoose.Schema({
  receiptNo: {
    type: String,
    required: true,
  },
  dealer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Dealer',
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  month: {
    type: String,
    required: true,
  },
  paymentDate: {
    type: Date,
    default: Date.now,
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'bank_transfer', 'jazzcash', 'easypaisa'],
    required: true,
  },
  paymentType: {
    type: String,
    enum: ['add_payment', 'receive_payment'],
    default: 'receive_payment',
  },
  paymentFor: {
    type: String,
    default: '',
  },
  // ✅ Commission applied on this received payment
  commission: {
    type: Number,
    default: 0,
  },
  commissionRate: {
    type: String,
    default: '',
  },
  paidBy: {
    type: String,
    default: '',
  },
  collectedBy: {
    type: String,
    default: '',
  },
  receivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  remarks: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true,
});

// ✅ IMPORTANT: Drop the unique index on receiptNo so same receipt can exist across types
dealerPaymentSchema.index({ receiptNo: 1 });

module.exports = mongoose.model('DealerPayment', dealerPaymentSchema);