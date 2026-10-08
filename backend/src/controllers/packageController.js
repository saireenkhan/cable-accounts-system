
const mongoose = require('mongoose');
const PackageModel = require('../models/Package');
const logger = require('../utils/logger');
const tenantScope = require('../utils/tenantScope');

// ============================================================
// HELPERS
// ============================================================

// Accept an ISP ObjectId or an object containing _id.
// Each package stores exactly ONE ISP.
const normalizeIsp = (value) => {
  if (value && typeof value === 'object') {
    return String(value._id || value.id || '');
  }

  return String(value || '').trim();
};

const validateIsp = (value) => {
  const isp = normalizeIsp(value);

  if (!isp) {
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

  return { valid: true, isp };
};

const handlePackageError = (res, error, action) => {
  logger.error(`${action} package error: ${error.message}`);

  if (error.code === 11000) {
    return res.status(400).json({
      success: false,
      message:
        'A package with this name already exists for this ISP',
    });
  }

  if (error.name === 'ValidationError') {
    const messages = Object.values(error.errors).map(
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
      message: 'Invalid package ID',
    });
  }

  return res.status(500).json({
    success: false,
    message: error.message || 'Server error',
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

    return res.json({
      success: true,
      packages,
    });
  } catch (error) {
    logger.error(`Get packages error: ${error.message}`);

    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// ============================================================
// CREATE PACKAGE
// POST /api/packages
// Body: {
//   isp,
//   name,
//   bandwidth,
//   sellingPrice,
//   purchasePrice,
//   description
// }
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

    // Validate ISP
    const ispValidation = validateIsp(isp);

    if (!ispValidation.valid) {
      return res.status(400).json({
        success: false,
        message: ispValidation.message,
      });
    }

    const selectedIsp = ispValidation.isp;

    // Validate package name
    if (!name || !String(name).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Package name is required',
      });
    }

    const normalizedName = String(name)
      .trim()
      .toUpperCase();

    // Validate prices
    const sell = Number(sellingPrice);
    const cost = Number(purchasePrice);

    if (
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

    // Duplicate name is restricted WITHIN the selected ISP.
    const existingPackage = await Package.findOne({
      name: normalizedName,
      isp: selectedIsp,
    });

    if (existingPackage) {
      return res.status(400).json({
        success: false,
        message:
          `Package "${normalizedName}" already exists for this ISP`,
      });
    }

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

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid package ID',
      });
    }

    const existing = await Package.findById(req.params.id);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Package not found',
      });
    }

    const update = {};

    // ISP is updated only when provided.
    if (isp !== undefined) {
      const ispValidation = validateIsp(isp);

      if (!ispValidation.valid) {
        return res.status(400).json({
          success: false,
          message: ispValidation.message,
        });
      }

      update.isp = ispValidation.isp;
    }

    if (name !== undefined) {
      if (!String(name).trim()) {
        return res.status(400).json({
          success: false,
          message: 'Package name cannot be empty',
        });
      }

      update.name = String(name).trim().toUpperCase();
    }

    if (bandwidth !== undefined) {
      update.bandwidth = String(bandwidth).trim() || 'N/A';
    }

    if (sellingPrice !== undefined) {
      const val = Number(sellingPrice);

      if (!Number.isFinite(val) || val <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Selling price must be greater than 0',
        });
      }

      update.sellingPrice = val;
    }

    if (purchasePrice !== undefined) {
      const val = Number(purchasePrice);

      if (!Number.isFinite(val) || val <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Purchase price must be greater than 0',
        });
      }

      update.purchasePrice = val;
    }

    if (description !== undefined) {
      update.description = String(description || '').trim();
    }

    if (isActive !== undefined) {
      update.isActive = Boolean(isActive);
    }

    // Check duplicates using the FINAL ISP and name.
    const finalName = update.name || existing.name;
    const finalIsp = update.isp || existing.isp;

    if (finalIsp) {
      const duplicate = await Package.findOne({
        name: finalName,
        isp: finalIsp,
        _id: { $ne: existing._id },
      });

      if (duplicate) {
        return res.status(400).json({
          success: false,
          message:
            `Package "${finalName}" already exists for this ISP`,
        });
      }
    }

    // Recalculate profit when prices change.
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

    const pkg = await Package.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      {
        new: true,
        runValidators: true,
      }
    );

    return res.json({
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
    const pkg = await Package.findByIdAndDelete(
      req.params.id
    );

    if (!pkg) {
      return res.status(404).json({
        success: false,
        message: 'Package not found',
      });
    }

    return res.json({
      success: true,
      message: 'Package deleted successfully',
    });
  } catch (error) {
    return handlePackageError(res, error, 'Delete');
  }
};
