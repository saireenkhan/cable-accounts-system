const mongoose = require('mongoose');

const normalizeKey = (value) => String(value ?? '').trim().toLowerCase();

const partnerSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: false,
      index: true,
    },
    partnerId: { type: String, required: true, trim: true },
    partnerIdKey: { type: String, required: true, select: false },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true },
    activationDate: { type: Date },
    expiryDate: { type: Date },
    cnic: { type: String, trim: true },
    address: { type: String, required: true },
    area: { type: String, trim: true, default: '' },
    isp: { type: String, trim: true, default: '' },
    ispKey: { type: String, default: '', select: false },
    package: { type: String },
    monthlyFee: { type: Number, default: 0 },
    discount: { type: Number, default: 0, min: 0 },
    partner: { type: String, trim: true, default: '' },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended', 'expired'],
      default: 'active',
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Keep normalized keys in sync when creating and saving documents.
partnerSchema.pre('validate', function () {
  this.partnerIdKey = normalizeKey(this.partnerId);
  this.ispKey = normalizeKey(this.isp);
});

// Keep normalized keys in sync for findByIdAndUpdate/findOneAndUpdate.
partnerSchema.pre('findOneAndUpdate', function () {
  const update = this.getUpdate();
  if (!update) return;
  if (Array.isArray(update)) {
    throw new Error('Pipeline updates are not supported for Partner records');
  }
  const fields = update.$set || update;
  const normalized = {};
  if (fields.partnerId !== undefined) {
    normalized.partnerIdKey = normalizeKey(fields.partnerId);
  }
  if (fields.isp !== undefined) {
    normalized.ispKey = normalizeKey(fields.isp);
  }
  if (Object.keys(normalized).length) {
    if (update.$set) Object.assign(update.$set, normalized);
    else Object.assign(update, normalized);
    this.setUpdate(update);
  }
});

// Allows same display ID in different ISPs, but not within one tenant + ISP.
partnerSchema.index(
  { tenantId: 1, ispKey: 1, partnerIdKey: 1 },
  { unique: true, name: 'tenant_isp_partnerid_unique' }
);

module.exports = mongoose.model('Partner', partnerSchema);
