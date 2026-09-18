const mongoose = require('mongoose');

const whatsappMessageSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      index: true,
    },
    direction: {
      type: String,
      enum: ['in', 'out'],
      required: true,
    },
    body: {
      type: String,
      default: '',
    },
    intent: {
      type: String,
      default: null,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      default: null,
    },
    waMessageId: {
      type: String,
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: ['received', 'sent', 'delivered', 'read', 'failed'],
      default: 'received',
    },
    error: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

whatsappMessageSchema.index({ createdAt: -1 });

module.exports = mongoose.model('WhatsAppMessage', whatsappMessageSchema);