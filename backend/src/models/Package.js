const mongoose = require('mongoose');

const packageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    enum: ['BASIC', 'STANDARD', 'PREMIUM'],
    unique: true,
  },
  sellingPrice: {
    type: Number,
    required: true,
  },
  purchasePrice: {
    type: Number,
    required: true,
  },
  profit: {
    type: Number,
  },
  bandwidth: {
    type: String,
    enum: ['25 Mbps', '50 Mbps', '100 Mbps', '150 Mbps', '200 Mbps'],
  },
  channels: [{
    type: String,
  }],
  description: {
    type: String,
    trim: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

packageSchema.pre('save', function(next) {
  this.profit = this.sellingPrice - this.purchasePrice;
  next();
});

module.exports = mongoose.model('Package', packageSchema);