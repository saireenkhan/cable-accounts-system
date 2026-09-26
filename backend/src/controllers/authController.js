const User = require('../models/User');
const Tenant = require('../models/Tenant');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

const generateToken = (id, tenantId) => {
  return jwt.sign({ id, tenantId: tenantId || null }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d',
  });
};

// Helper: attach tenantName to a user object
async function attachTenantName(user) {
  let tenantName = null;
  if (user.tenantId) {
    const t = await Tenant.findById(user.tenantId).lean();
    if (t) tenantName = t.name;
  }
  return tenantName;
}

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    user.lastLogin = new Date();
    await user.save();

    const tenantName = await attachTenantName(user);

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId || null,
        tenantName,
        phone: user.phone || '',
        address: user.address || '',
        avatar: user.avatar || '',
      },
      token: generateToken(user._id, user.tenantId),
    });
  } catch (error) {
    logger.error(`Login error: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const tenantName = await attachTenantName(user);

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId || null,
        tenantName,
        phone: user.phone || '',
        address: user.address || '',
        avatar: user.avatar || '',
      },
    });
  } catch (error) {
    logger.error(`getMe error: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update name, phone, address
exports.updateMe = async (req, res) => {
  try {
    const { name, phone, address } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (name !== undefined) user.name = String(name).trim();
    if (phone !== undefined) user.phone = String(phone).trim();
    if (address !== undefined) user.address = String(address).trim();

    await user.save();

    const tenantName = await attachTenantName(user);

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId || null,
        tenantName,
        phone: user.phone || '',
        address: user.address || '',
        avatar: user.avatar || '',
      },
    });
  } catch (error) {
    logger.error(`updateMe error: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

// Change password
exports.updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Both passwords are required' });
    }

    if (String(newPassword).length < 6) {
      return res
        .status(400)
        .json({ message: 'New password must be at least 6 characters' });
    }

    const user = await User.findById(req.user.id).select('+password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password updated' });
  } catch (error) {
    logger.error(`updatePassword error: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update avatar (stores file as base64 in DB)
exports.updateAvatar = async (req, res) => {
  try {
    const { avatar } = req.body;

    if (!avatar || typeof avatar !== 'string' || !avatar.startsWith('data:image/')) {
      return res.status(400).json({ message: 'Invalid image data' });
    }

    if (avatar.length > 2_800_000) {
      return res.status(400).json({ message: 'Image too large (max ~2MB)' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.avatar = avatar;
    await user.save();

    res.json({ success: true, avatar: user.avatar });
  } catch (error) {
    logger.error(`updateAvatar error: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

// Verify current password (for live validation on profile page)
exports.verifyPassword = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ success: false, message: 'Password required' });
    }

    const user = await User.findById(req.user.id).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Incorrect password' });
    }

    res.json({ success: true });
  } catch (error) {
    logger.error(`verifyPassword error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Update the current tenant's name
exports.updateTenantName = async (req, res) => {
  try {
    const { companyName } = req.body;

    if (!companyName || !String(companyName).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Company name is required',
      });
    }

    const tenantId = req.user.tenantId;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'No tenant linked to this account',
      });
    }

    const tenant = await Tenant.findByIdAndUpdate(
      tenantId,
      { name: String(companyName).trim() },
      { new: true }
    );

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found',
      });
    }

    res.json({ success: true, tenant });
  } catch (error) {
    logger.error(`updateTenantName error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};