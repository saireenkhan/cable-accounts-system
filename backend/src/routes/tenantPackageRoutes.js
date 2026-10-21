
const express = require('express');

const {
  protect,
  requireTenant,
} = require('../middleware/auth');

const router = express.Router();

router.get(
  '/me',
  protect,
  requireTenant,
  (req, res) => {
    return res.json({
      success: true,

      company: {
        id: req.tenant._id,
        name: req.tenant.name,
      },

      package: {
        id: req.masterPackage._id,
        name: req.masterPackage.name,
        monthlyPrice: req.masterPackage.monthlyPrice,
      },

      allowedPages: req.allowedPages,
    });
  }
);

module.exports = router;
