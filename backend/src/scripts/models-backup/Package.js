const mongoose = require('mongoose');

const packageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true, // ✅ stores name as UPPERCASE automatically
  },
  sellingPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  purchasePrice: {
    type: Number,
    required: true,
    min: 0,
  },
  profit: {
    type: Number,
    default: 0,
  },
  bandwidth: {
    type: String,
    trim: true,
    default: 'N/A',
    // ✅ enum removed — accepts any text like "25 Mbps", "Unlimited", "200Mbps FTTH"
  },
  channels: [{
    type: String,
  }],
  description: {
    type: String,
    trim: true,
    default: '',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// ✅ Auto-calculate profit on save
packageSchema.pre('save', function (next) {
  this.profit = (this.sellingPrice || 0) - (this.purchasePrice || 0);
  next();
});

// ✅ Also recalc on update
packageSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate();
  if (update.sellingPrice !== undefined && update.purchasePrice !== undefined) {
    update.profit = update.sellingPrice - update.purchasePrice;
  }
  next();
});

module.exports = mongoose.model('Package', packageSchema);