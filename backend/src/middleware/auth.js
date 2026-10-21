
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Tenant = require('../models/Tenant');
const MasterPackage = require('../models/MasterPackage');
const logger = require('../utils/logger');

const deny = (res, status, message) =>
  res.status(status).json({
    success: false,
    message,
  });

// ======================================================
// AUTHENTICATION + TENANT PACKAGE LOADING
// ======================================================

const protect = async (req, res, next) => {
  try {
    const authorization = req.headers.authorization || '';

    if (!authorization.startsWith('Bearer ')) {
      return deny(res, 401, 'Not authorized, no token');
    }

    const token = authorization.slice(7).trim();

    if (!token) {
      return deny(res, 401, 'Not authorized, no token');
    }

    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not configured');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded.id) {
      return deny(res, 401, 'Invalid authentication token');
    }

    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return deny(res, 401, 'User not found');
    }

    if (!user.isActive) {
      return deny(res, 403, 'User account is disabled');
    }

    // Master account is not restricted by tenant packages.
    if (user.role === 'superadmin') {
      if (user.tenantId) {
        return deny(res, 403, 'Invalid Master account configuration');
      }

      req.user = user;
      req.tenantId = null;
      req.tenant = null;
      req.masterPackage = null;
      req.allowedPages = [];

      return next();
    }

    if (!user.tenantId) {
      return deny(res, 403, 'No company linked to this account');
    }

    const tenant = await Tenant.findById(user.tenantId);

    if (!tenant) {
      return deny(res, 403, 'Company account not found');
    }

    if (!tenant.isActive) {
      return deny(res, 403, 'Company account is disabled');
    }

    // Every tenant must have an assigned package.
    if (!tenant.masterPackageId) {
      return deny(
        res,
        403,
        'No subscription package assigned to this company'
      );
    }

    const selectedPackage = await MasterPackage.findOne({
      _id: tenant.masterPackageId,
      isActive: true,
    }).select('name monthlyPrice allowedPages isActive');

    if (!selectedPackage) {
      return deny(
        res,
        403,
        'Subscription package is inactive or unavailable'
      );
    }

    req.user = user;
    req.tenantId = tenant._id;
    req.tenant = tenant;
    req.masterPackage = selectedPackage;

    // Use package permissions from MongoDB, not the client.
    req.allowedPages = Array.isArray(selectedPackage.allowedPages)
      ? selectedPackage.allowedPages
      : [];

    return next();
  } catch (error) {
    logger.error(`Auth error: ${error.message}`);

    if (
      error.name === 'TokenExpiredError' ||
      error.name === 'JsonWebTokenError'
    ) {
      return deny(res, 401, 'Not authorized, token failed');
    }

    return deny(res, 500, 'Authentication service failed');
  }
};

// ======================================================
// ROLE-BASED AUTHORIZATION
// ======================================================

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return deny(res, 401, 'Authentication required');
    }

    if (!roles.includes(req.user.role)) {
      return deny(res, 403, 'Access denied for this user role');
    }

    return next();
  };
};

// ======================================================
// REQUIRE TENANT
// ======================================================

const requireTenant = (req, res, next) => {
  if (
    !req.user ||
    req.user.role === 'superadmin' ||
    !req.tenantId ||
    !req.tenant
  ) {
    return deny(res, 403, 'Company account access required');
  }

  return next();
};

// ======================================================
// REQUIRE SUBSCRIPTION PAGE PERMISSION
// ======================================================

const requirePackagePage = (page) => {
  return (req, res, next) => {
    if (!req.user) {
      return deny(res, 401, 'Authentication required');
    }

    if (req.user.role === 'superadmin') {
      return next();
    }

    if (!req.tenantId || !req.masterPackage) {
      return deny(res, 403, 'Active company subscription required');
    }

    if (!req.allowedPages.includes(page)) {
      return deny(
        res,
        403,
        `Your subscription package does not include ${page}`
      );
    }

    return next();
  };
};

module.exports = {
  protect,
  authorize,
  requireTenant,
  requirePackagePage,
};
