
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// ============================================
// USER SCHEMA
// ============================================

const userSchema = new mongoose.Schema(
  {
    // ========================================
    // BASIC USER INFORMATION
    // ========================================

    name: {
      type: String,
      required: true,
      trim: true,
    },

    // ========================================
    // TENANT / COMPANY RELATIONSHIP
    // ========================================
    // Master Admin: tenantId = null
    // Company users: tenantId = company ObjectId

    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: false,
      default: null,
      index: true,
    },

    // ========================================
    // LOGIN CREDENTIALS
    // ========================================

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      select: false,
    },

    // ========================================
    // USER ROLES
    // ========================================

    role: {
      type: String,
      enum: [
        'superadmin',
        'admin',
        'manager',
        'cashier',
        'technician',
      ],
      default: 'cashier',
    },

    // ========================================
    // PROFILE INFORMATION
    // ========================================

    phone: {
      type: String,
      trim: true,
      default: '',
    },

    address: {
      type: String,
      trim: true,
      default: '',
    },

    avatar: {
      type: String,
      default: '',
    },

    // ========================================
    // ACCOUNT STATUS
    // ========================================

    isActive: {
      type: Boolean,
      default: true,
    },

    lastLogin: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// ============================================
// PASSWORD HASHING
// ============================================
// Automatically hashes password when a user
// is created or the password is changed.
// ============================================

userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }

  this.password = await bcrypt.hash(
    this.password,
    10
  );
});

// ============================================
// COMPARE PASSWORD
// ============================================
// Used during login authentication.
// ============================================

userSchema.methods.comparePassword = async function (
  candidatePassword
) {
  return bcrypt.compare(
    candidatePassword,
    this.password
  );
};

// ============================================
// EXPORT USER MODEL
// ============================================

module.exports = mongoose.model(
  'User',
  userSchema
);
