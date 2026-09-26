const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  expenseNo: {
    type: String,
    unique: true,
    required: true,
  },
  category: {
    type: String,
    enum: ['electricity', 'salary', 'maintenance', 'equipment', 'internet', 'other'],
    required: true,
  },
  description: {
    type: String,
    trim: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  paidBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Expense', expenseSchema);