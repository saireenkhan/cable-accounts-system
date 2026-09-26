const mongoose = require('mongoose');

const billSchema = new mongoose.Schema({
  billNo: {
    type: String,
    unique: true,
    required: true,
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
  year: {
    type: Number,
    required: true,
  },
  totalAmount: {
    type: Number,
    required: true,
  },
  paidAmount: {
    type: Number,
    default: 0,
  },
  balance: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ['paid', 'partial', 'pending'],
    default: 'pending',
  },
  dueDate: {
    type: Date,
  },
  generatedDate: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

billSchema.pre('save', function(next) {
  this.balance = this.totalAmount - this.paidAmount;
  if (this.balance === 0) {
    this.status = 'paid';
  } else if (this.paidAmount > 0) {
    this.status = 'partial';
  } else {
    this.status = 'pending';
  }
  next();
});

module.exports = mongoose.model('Bill', billSchema);