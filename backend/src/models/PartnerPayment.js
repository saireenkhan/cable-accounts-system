const mongoose = require('mongoose');

const PartnerPaymentSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: false,
      index: true,
    },
    receiptNo: { type: String, required: true, unique: true },
    // Always store MongoDB _id, NOT the display partnerId.
    partner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Partner',
      required: true,
    },
    month: { type: String, required: true },
    amount: { type: Number, required: true, default: 0 },
    packagePrice: { type: Number, default: 0 },
    paymentDate: { type: Date, default: Date.now },
    paymentMethod: { type: String, default: 'cash' },
    receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    remarks: { type: String, default: '' },
    isNoPayment: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// One regular payment document per MongoDB partner _id + month.
// Subsequent payments are merged by the existing controller.
PartnerPaymentSchema.index(
  { partner: 1, month: 1 },
  {
    unique: true,
    partialFilterExpression: { isNoPayment: false },
  }
);

module.exports = mongoose.model('PartnerPayment', PartnerPaymentSchema);
