
const mongoose = require('mongoose');

// ============================================================
// HELPERS
// ============================================================

const normalizeKey = (value) => {
  if (typeof value !== 'string') return '';
  return value.trim().toUpperCase();
};

const isSafeText = (value) => {
  return (
    typeof value === 'string' &&
    !/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(value)
  );
};

const isValidCustomerId = (value) => {
  return (
    typeof value === 'string' &&
    /^[a-zA-Z0-9_-]{1,50}$/.test(value)
  );
};

// ============================================================
// CUSTOMER SCHEMA
// ============================================================

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
      required: [true, 'Customer ID is required'],
      trim: true,
      minlength: 1,
      maxlength: 50,
      validate: {
        validator: isValidCustomerId,
        message: 'Customer ID contains invalid characters',
      },
    },

    customerIdKey: {
      type: String,
      select: false,
      default: '',
    },

    ispKey: {
      type: String,
      select: false,
      default: '',
    },

    name: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
      minlength: 1,
      maxlength: 120,
      validate: {
        validator: isSafeText,
        message: 'Customer name contains invalid characters',
      },
    },

    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      maxlength: 30,
      validate: {
        validator: (value) =>
          typeof value === 'string' &&
          /^[0-9+\-\s()]{7,30}$/.test(value),
        message: 'Invalid phone number',
      },
    },

    activationDate: {
      type: Date,
      default: null,
    },

    expiryDate: {
      type: Date,
      default: null,
    },

    cnic: {
      type: String,
      trim: true,
      default: '',
      maxlength: 20,
      validate: {
        validator: (value) =>
          !value || /^[0-9-]{1,20}$/.test(value),
        message: 'Invalid CNIC format',
      },
    },

    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true,
      minlength: 1,
      maxlength: 500,
      validate: {
        validator: isSafeText,
        message: 'Address contains invalid characters',
      },
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
      maxlength: 100,
      validate: {
        validator: (value) =>
          !value || isSafeText(value),
        message: 'Invalid ISP name',
      },
    },

    package: {
      type: String,
      trim: true,
      default: '',
      maxlength: 150,
      validate: {
        validator: (value) =>
          !value || isSafeText(value),
        message: 'Invalid package name',
      },
    },

    monthlyFee: {
      type: Number,
      default: 0,
      min: [0, 'Monthly fee cannot be negative'],
      max: [10000000, 'Monthly fee exceeds limit'],
    },

    discount: {
      type: Number,
      default: 0,
      min: [0, 'Discount cannot be negative'],
      max: [10000000, 'Discount exceeds limit'],
    },

    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended', 'expired'],
      default: 'active',
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
    strict: true,
    versionKey: false,
  }
);

// ============================================================
// NORMALIZE CUSTOMER ID AND ISP BEFORE VALIDATION
// ============================================================

customerSchema.pre('validate', function () {
  if (this.isModified('customerId') || !this.customerIdKey) {
    this.customerIdKey = normalizeKey(this.customerId);
  }

  if (this.isModified('isp') || !this.ispKey) {
    this.ispKey = normalizeKey(this.isp);
  }
});

// ============================================================
// DATABASE INDEXES
// ============================================================

// Case-insensitive uniqueness within each tenant and ISP.
// Different ISPs may use the same Customer ID.

customerSchema.index(
  {
    tenantId: 1,
    ispKey: 1,
    customerIdKey: 1,
  },
  {
    unique: true,
    name: 'tenant_isp_userid_unique',
  }
);

// ============================================================
// EXPORT MODEL
// ============================================================

module.exports = mongoose.model('Customer', customerSchema);
