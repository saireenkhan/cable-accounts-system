
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Tenant = require('../models/Tenant');
const logger = require('../utils/logger');

const protect = async (req, res, next) => {
  try {
    const authorization = req.headers.authorization || '';

    if (!authorization.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, no token',
      });
    }

    const token = authorization.slice(7).trim();

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, no token',
      });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not configured');
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    if (!decoded.id) {
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token',
      });
    }

    const user = await User.findById(decoded.id)
      .select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'User account is disabled',
      });
    }

    // Master account
    if (user.role === 'superadmin') {
      if (user.tenantId) {
        return res.status(403).json({
          success: false,
          message: 'Invalid Master account configuration',
        });
      }

      req.user = user;
      req.tenantId = null;
      req.tenant = null;

      return next();
    }

    // Company accounts must have a tenant
    if (!user.tenantId) {
      return res.status(403).json({
        success: false,
        message: 'No company linked to this account',
      });
    }

    // Load the actual company from MongoDB
    const tenant = await Tenant.findById(user.tenantId);

    if (!tenant) {
      return res.status(403).json({
        success: false,
        message: 'Company account not found',
      });
    }

    if (!tenant.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Company account is disabled',
      });
    }

    // Never use tenant ID supplied by the client
    req.user = user;
    req.tenantId = tenant._id;
    req.tenant = tenant;

    next();
  } catch (error) {
    logger.error(`Auth error: ${error.message}`);

    return res.status(401).json({
      success: false,
      message: 'Not authorized, token failed',
    });
  }
};

// Role-based authorization
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied for this user role',
      });
    }

    next();
  };
};

// Require an authenticated company user
const requireTenant = (req, res, next) => {
  if (
    !req.user ||
    req.user.role === 'superadmin' ||
    !req.tenantId ||
    !req.tenant
  ) {
    return res.status(403).json({
      success: false,
      message: 'Company account access required',
    });
  }

  next();
};

module.exports = {
  protect,
  authorize,
  requireTenant,
};
