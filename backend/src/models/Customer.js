
const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: false,
      index: true,
    },
    customerId: {
      type: String,
      trim: true,
    },
    customerIdKey: {
      type: String,
      select: false,
    },
    ispKey: {
      type: String,
      select: false,
      default: '',
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
    },
    activationDate: {
      type: Date,
    },
    expiryDate: {
      type: Date,
    },
    cnic: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      required: true,
    },
area: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Area',
  default: null,
},
    isp: {
      type: String,
      trim: true,
      default: '',
    },
    package: {
      type: String,
    },
    monthlyFee: {
      type: Number,
      default: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended', 'expired'],
      default: 'active',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

customerSchema.index(
  { tenantId: 1, ispKey: 1, customerIdKey: 1 },
  {
    unique: true,
    name: 'tenant_isp_userid_unique',
  }
);

module.exports = mongoose.model('Customer', customerSchema);
