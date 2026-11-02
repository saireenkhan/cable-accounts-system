
const mongoose = require('mongoose');
const PackageModel = require('../models/Package');
const ISPModel = require('../models/ISP');
const logger = require('../utils/logger');
const tenantScope = require('../utils/tenantScope');

// ============================================================
// HELPERS
// ============================================================

// Normalize ISP values.
// Supports string, ObjectId, object with _id, or single-item array.
const normalizeIsp = (value) => {
  if (Array.isArray(value)) {
    value = value.find(Boolean) || null;
  }

  if (value && typeof value === 'object') {
    return String(value._id || value.id || '').trim();
  }

  return String(value ?? '').trim();
};

// Check ISP availability within the current tenant.
const getISPState = async (req) => {
  const ISP = tenantScope(ISPModel, req);

  const hasISPs = Boolean(await ISP.exists({}));

  return { ISP, hasISPs };
};

const validateIsp = async (value, req) => {
  const ISP = tenantScope(ISPModel, req);

  const hasISPs = Boolean(await ISP.exists({}));

  const isp = normalizeIsp(value);

  // No ISP records: ISP is optional
  if (!hasISPs && !isp) {
    return {
      valid: true,
      isp: null,
    };
  }

  // ISP records exist: ISP is required
  if (hasISPs && !isp) {
    return {
      valid: false,
      message: 'Please select an ISP',
    };
  }

  if (!mongoose.isValidObjectId(isp)) {
    return {
      valid: false,
      message: 'Invalid ISP ID',
    };
  }

  const existingISP = await ISP.findById(isp);

  if (!existingISP) {
    return {
      valid: false,
      message: 'Selected ISP not found',
    };
  }

  return {
    valid: true,
    isp: existingISP._id,
  };
};

// Handle package errors.
const handlePackageError = (res, error, action) => {
  logger.error(`${action} package error: ${error.message}`);

  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      message:
        'A package with this name already exists for this ISP',
    });
  }

  if (error.name === 'ValidationError') {
    const messages = Object.values(error.errors || {}).map(
      (e) => e.message
    );

    return res.status(400).json({
      success: false,
      message: messages.join(', ') || 'Validation failed',
    });
  }

  if (error.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid package ID or field value',
    });
  }

  return res.status(500).json({
    success: false,
    message: 'Server error',
  });
};

// ============================================================
// GET ALL PACKAGES
// GET /api/packages
// ============================================================

exports.getPackages = async (req, res) => {
  const Package = tenantScope(PackageModel, req);

  try {
    const packages = await Package.find()
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      packages,
    });
  } catch (error) {
    logger.error(`Get packages error: ${error.message}`);

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch packages',
    });
  }
};

// ============================================================
// CREATE PACKAGE
// POST /api/packages
// ============================================================

exports.createPackage = async (req, res) => {
  const Package = tenantScope(PackageModel, req);

  try {
    const {
      isp,
      name,
      bandwidth,
      sellingPrice,
      purchasePrice,
      description,
    } = req.body;

    // --------------------------------------------------------
    // VALIDATE ISP
    // --------------------------------------------------------

    const ispValidation = await validateIsp(isp, req);

    if (!ispValidation.valid) {
      return res.status(400).json({
        success: false,
        message: ispValidation.message,
      });
    }

    const selectedIsp = ispValidation.isp;

    // --------------------------------------------------------
    // VALIDATE PACKAGE NAME
    // --------------------------------------------------------

    if (!name || !String(name).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Package name is required',
      });
    }

    const normalizedName = String(name)
      .trim()
      .toUpperCase();

    // --------------------------------------------------------
    // VALIDATE PRICES
    // --------------------------------------------------------

    const sell = Number(sellingPrice);
    const cost = Number(purchasePrice);

    if (
      sellingPrice === '' ||
      sellingPrice == null ||
      purchasePrice === '' ||
      purchasePrice == null ||
      !Number.isFinite(sell) ||
      !Number.isFinite(cost) ||
      sell <= 0 ||
      cost <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Selling price and purchase price must be greater than 0',
      });
    }

    // --------------------------------------------------------
    // CHECK DUPLICATE PACKAGE
    // --------------------------------------------------------

    const existingPackage = await Package.findOne({
      name: normalizedName,
      isp: selectedIsp,
    });

    if (existingPackage) {
      return res.status(409).json({
        success: false,
        message:
          `Package "${normalizedName}" already exists for this ISP`,
      });
    }

    // --------------------------------------------------------
    // CREATE PACKAGE
    // --------------------------------------------------------

    const pkg = await Package.create({
      isp: selectedIsp,
      name: normalizedName,
      sellingPrice: sell,
      purchasePrice: cost,
      profit: sell - cost,

      bandwidth:
        bandwidth && String(bandwidth).trim()
          ? String(bandwidth).trim()
          : 'N/A',

      description: description
        ? String(description).trim()
        : '',

      isActive: true,
    });

    return res.status(201).json({
      success: true,
      package: pkg,
      message: 'Package created successfully',
    });

  } catch (error) {
    return handlePackageError(res, error, 'Create');
  }
};

// ============================================================
// UPDATE PACKAGE
// PUT /api/packages/:id
// ============================================================

exports.updatePackage = async (req, res) => {
  const Package = tenantScope(PackageModel, req);

  try {
    const {
      isp,
      name,
      bandwidth,
      sellingPrice,
      purchasePrice,
      description,
      isActive,
    } = req.body;

    // --------------------------------------------------------
    // VALIDATE PACKAGE ID
    // --------------------------------------------------------

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid package ID',
      });
    }

    // --------------------------------------------------------
    // FIND EXISTING PACKAGE
    // --------------------------------------------------------

    const existing = await Package.findById(req.params.id);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Package not found',
      });
    }

    const update = {};
    const ispState = await getISPState(req);

    // --------------------------------------------------------
    // UPDATE ISP
    // --------------------------------------------------------

    if (isp !== undefined) {
      const ispValidation = await validateIsp(
        isp,
        req,
        ispState
      );

      if (!ispValidation.valid) {
        return res.status(400).json({
          success: false,
          message: ispValidation.message,
        });
      }

      update.isp = ispValidation.isp;

    } else if (!ispState.hasISPs) {
      // No ISP records exist.
      // Permit editing an unassigned package without ISP.
      // Preserve any previous association rather than
      // silently deleting existing information.
      if (!existing.isp) {
        update.isp = null;
      }

    } else if (!existing.isp) {
      // ISP records now exist.
      // An unassigned package must select one.
      return res.status(400).json({
        success: false,
        message: 'Please select an ISP',
      });
    }

    // --------------------------------------------------------
    // UPDATE NAME
    // --------------------------------------------------------

    if (name !== undefined) {
      if (!String(name).trim()) {
        return res.status(400).json({
          success: false,
          message: 'Package name cannot be empty',
        });
      }

      update.name = String(name)
        .trim()
        .toUpperCase();
    }

    // --------------------------------------------------------
    // UPDATE BANDWIDTH
    // --------------------------------------------------------

    if (bandwidth !== undefined) {
      update.bandwidth =
        String(bandwidth || '').trim() || 'N/A';
    }

    // --------------------------------------------------------
    // UPDATE SELLING PRICE
    // --------------------------------------------------------

    if (sellingPrice !== undefined) {
      const val = Number(sellingPrice);

      if (
        sellingPrice === '' ||
        sellingPrice === null ||
        !Number.isFinite(val) ||
        val <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: 'Selling price must be greater than 0',
        });
      }

      update.sellingPrice = val;
    }

    // --------------------------------------------------------
    // UPDATE PURCHASE PRICE
    // --------------------------------------------------------

    if (purchasePrice !== undefined) {
      const val = Number(purchasePrice);

      if (
        purchasePrice === '' ||
        purchasePrice === null ||
        !Number.isFinite(val) ||
        val <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: 'Purchase price must be greater than 0',
        });
      }

      update.purchasePrice = val;
    }

    // --------------------------------------------------------
    // UPDATE DESCRIPTION
    // --------------------------------------------------------

    if (description !== undefined) {
      update.description = String(
        description || ''
      ).trim();
    }

    // --------------------------------------------------------
    // UPDATE STATUS
    // --------------------------------------------------------

    if (isActive !== undefined) {
      update.isActive = Boolean(isActive);
    }

    // --------------------------------------------------------
    // CHECK DUPLICATES USING FINAL NAME AND ISP
    // --------------------------------------------------------

    const finalName = update.name || existing.name;

    const finalIsp =
      update.isp !== undefined
        ? update.isp
        : existing.isp ?? null;

    const duplicate = await Package.findOne({
      name: finalName,
      isp: finalIsp,
      _id: { $ne: existing._id },
    });

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message:
          `Package "${finalName}" already exists for this ISP`,
      });
    }

    // --------------------------------------------------------
    // RECALCULATE PROFIT
    // --------------------------------------------------------

    if (
      update.sellingPrice !== undefined ||
      update.purchasePrice !== undefined
    ) {
      const newSell =
        update.sellingPrice !== undefined
          ? update.sellingPrice
          : existing.sellingPrice;

      const newCost =
        update.purchasePrice !== undefined
          ? update.purchasePrice
          : existing.purchasePrice;

      update.profit = newSell - newCost;
    }

    // --------------------------------------------------------
    // SAVE UPDATE
    // --------------------------------------------------------

    const pkg = await Package.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!pkg) {
      return res.status(404).json({
        success: false,
        message: 'Package not found',
      });
    }

    return res.status(200).json({
      success: true,
      package: pkg,
      message: 'Package updated successfully',
    });

  } catch (error) {
    return handlePackageError(res, error, 'Update');
  }
};

// ============================================================
// DELETE PACKAGE
// DELETE /api/packages/:id
// ============================================================

exports.deletePackage = async (req, res) => {
  const Package = tenantScope(PackageModel, req);

  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid package ID',
      });
    }

    const pkg = await Package.findByIdAndDelete(
      req.params.id
    );

    if (!pkg) {
      return res.status(404).json({
        success: false,
        message: 'Package not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Package deleted successfully',
    });

  } catch (error) {
    return handlePackageError(res, error, 'Delete');
  }
};
