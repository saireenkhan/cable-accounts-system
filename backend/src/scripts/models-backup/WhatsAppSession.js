const mongoose = require('mongoose');

const whatsappSessionSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    state: {
      type: String,
      enum: ['idle', 'awaiting_customer_id'],
      default: 'idle',
    },
    lastIntent: {
      type: String,
      default: null,
    },
    context: {
      type: Object,
      default: {},
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('WhatsAppSession', whatsappSessionSchema);