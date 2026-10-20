
const User = require('../models/User');
const Tenant = require('../models/Tenant');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

// ============================================
// GENERATE JWT
// ============================================

const generateToken = (id, tenantId) => {
  return jwt.sign(
    {
      id: id.toString(),
      tenantId: tenantId ? tenantId.toString() : null,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRE || '30d',
    }
  );
};

// ============================================
// USER RESPONSE HELPER
// ============================================

function formatUser(user, tenantName = null) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    tenantId: user.tenantId || null,
    tenantName,
    phone: user.phone || '',
    address: user.address || '',
    avatar: user.avatar || '',
  };
}

// ============================================
// TENANT HELPER
// ============================================

async function getActiveTenant(user) {
  if (!user.tenantId) {
    return null;
  }

  return Tenant.findById(user.tenantId);
}

async function attachTenantName(user) {
  const tenant = await getActiveTenant(user);

  return tenant ? tenant.name : null;
}

// ============================================
// 1. COMPANY ADMIN / STAFF LOGIN
// ============================================
// Uses existing tenant login route

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail,
    }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Master accounts use the separate Master login
    if (user.role === 'superadmin') {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your user account has been disabled',
      });
    }

    // Validate company association
    if (!user.tenantId) {
      return res.status(403).json({
        success: false,
        message: 'No company is linked to this account',
      });
    }

    const tenant = await getActiveTenant(user);

    if (!tenant) {
      return res.status(403).json({
        success: false,
        message: 'Company account not found',
      });
    }

    if (!tenant.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your company account has been disabled',
      });
    }

    // Update login activity without saving password again
    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          lastLogin: new Date(),
        },
      }
    );

    const token = generateToken(
      user._id,
      tenant._id
    );

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      user: formatUser(user, tenant.name),
      token,
    });
  } catch (error) {
    logger.error(`Login error: ${error.message}`);

    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// ============================================
// 2. GET CURRENT USER
// ============================================

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const tenantName = await attachTenantName(user);

    return res.status(200).json({
      success: true,
      user: formatUser(user, tenantName),
    });
  } catch (error) {
    logger.error(`getMe error: ${error.message}`);

    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// ============================================
// 3. UPDATE PROFILE
// ============================================

exports.updateMe = async (req, res) => {
  try {
    const { name, phone, address } = req.body || {};

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (name !== undefined) {
      if (
        typeof name !== 'string' ||
        !name.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: 'Valid name is required',
        });
      }

      user.name = name.trim();
    }

    if (phone !== undefined) {
      user.phone = String(phone).trim();
    }

    if (address !== undefined) {
      user.address = String(address).trim();
    }

    await user.save();

    const tenantName = await attachTenantName(user);

    return res.status(200).json({
      success: true,
      user: formatUser(user, tenantName),
    });
  } catch (error) {
    logger.error(`updateMe error: ${error.message}`);

    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// ============================================
// 4. CHANGE PASSWORD
// ============================================

exports.updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};

    if (
      typeof currentPassword !== 'string' ||
      typeof newPassword !== 'string' ||
      !currentPassword
    ) {
      return res.status(400).json({
        success: false,
        message: 'Both passwords are required',
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters',
      });
    }

    if (newPassword.length > 128) {
      return res.status(400).json({
        success: false,
        message: 'New password cannot exceed 128 characters',
      });
    }

    const user = await User.findById(req.user.id)
      .select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const isMatch = await user.comparePassword(
      currentPassword
    );

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    user.password = newPassword;

    // Existing User model hashes password on save
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Password updated',
    });
  } catch (error) {
    logger.error(`updatePassword error: ${error.message}`);

    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// ============================================
// 5. UPDATE AVATAR
// ============================================

exports.updateAvatar = async (req, res) => {
  try {
    const { avatar } = req.body || {};

    if (
      !avatar ||
      typeof avatar !== 'string' ||
      !avatar.startsWith('data:image/')
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid image data',
      });
    }

    if (avatar.length > 2_800_000) {
      return res.status(400).json({
        success: false,
        message: 'Image too large (max ~2MB)',
      });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    user.avatar = avatar;

    await user.save();

    return res.status(200).json({
      success: true,
      avatar: user.avatar,
    });
  } catch (error) {
    logger.error(`updateAvatar error: ${error.message}`);

    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// ============================================
// 6. VERIFY CURRENT PASSWORD
// ============================================

exports.verifyPassword = async (req, res) => {
  try {
    const { password } = req.body || {};

    if (
      typeof password !== 'string' ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: 'Password required',
      });
    }

    const user = await User.findById(req.user.id)
      .select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const isMatch = await user.comparePassword(
      password
    );

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect password',
      });
    }

    return res.status(200).json({
      success: true,
    });
  } catch (error) {
    logger.error(`verifyPassword error: ${error.message}`);

    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// ============================================
// 7. UPDATE COMPANY NAME
// ============================================

exports.updateTenantName = async (req, res) => {
  try {
    const { companyName } = req.body || {};

    if (
      typeof companyName !== 'string' ||
      !companyName.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: 'Company name is required',
      });
    }

    if (companyName.trim().length > 120) {
      return res.status(400).json({
        success: false,
        message: 'Company name cannot exceed 120 characters',
      });
    }

    if (
      !req.user ||
      req.user.role !== 'admin' ||
      !req.tenantId
    ) {
      return res.status(403).json({
        success: false,
        message: 'Only company administrators can update company details',
      });
    }

    const tenant = await Tenant.findOneAndUpdate(
      {
        _id: req.tenantId,
        isActive: true,
      },
      {
        $set: {
          name: companyName.trim(),
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Active company not found',
      });
    }

    return res.status(200).json({
      success: true,
      tenant,
    });
  } catch (error) {
    logger.error(`updateTenantName error: ${error.message}`);

    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};
