
const { protect } = require('./auth');

const requireMaster = [
  protect,

  (req, res, next) => {
    if (
      req.user.role !== 'superadmin' ||
      req.user.tenantId != null
    ) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Master Admin only.',
      });
    }

    next();
  },
];

module.exports = requireMaster;
