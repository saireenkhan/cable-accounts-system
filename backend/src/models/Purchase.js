const mongoose = require('mongoose');

const purchaseSchema = new mongoose.Schema({
  purchaseNo: {
    type: String,
    unique: true,
    required: true,
  },
  vendor: {
    type: String,
    required: true,
    trim: true,
  },
  item: {
    type: String,
    required: true,
    trim: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
  unit: {
    type: String,
    trim: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  purchaseDate: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ['paid', 'partial', 'pending'],
    default: 'pending',
  },
  paidAmount: {
    type: Number,
    default: 0,
  },
  balance: {
    type: Number,
    default: 0,
  },
  createdBy: {
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

purchaseSchema.pre('save', function(next) {
  this.balance = this.amount - this.paidAmount;
  next();
});

module.exports = mongoose.model('Purchase', purchaseSchema);