const Package = require('../models/Package');
const logger = require('../utils/logger');

// ============================================================
// GET ALL PACKAGES
// GET /api/packages
// ============================================================
exports.getPackages = async (req, res) => {
  try {
    const packages = await Package.find().sort({ createdAt: -1 });
    res.json({ success: true, packages });
  } catch (error) {
    logger.error(`Get packages error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ============================================================
// CREATE PACKAGE
// POST /api/packages
// Body: { name, bandwidth, sellingPrice, purchasePrice, description }
// ============================================================
exports.createPackage = async (req, res) => {
  try {
    const { name, bandwidth, sellingPrice, purchasePrice, description } = req.body;

    console.log('📝 Creating package with data:', req.body);

    // ✅ Validate name
    if (!name || !String(name).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Package name is required',
      });
    }

    // ✅ Validate prices
    const sell = parseFloat(sellingPrice) || 0;
    const cost = parseFloat(purchasePrice) || 0;

    if (sell <= 0 || cost <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Selling price and purchase price must be greater than 0',
      });
    }

    // ✅ Normalize name to uppercase
    const normalizedName = String(name).trim().toUpperCase();

    // ✅ Check duplicate
    const existingPackage = await Package.findOne({ name: normalizedName });
    if (existingPackage) {
      return res.status(400).json({
        success: false,
        message: `Package "${normalizedName}" already exists`,
      });
    }

    // ✅ Create package
    const pkg = await Package.create({
      name: normalizedName,
      sellingPrice: sell,
      purchasePrice: cost,
      bandwidth: bandwidth && String(bandwidth).trim() ? String(bandwidth).trim() : 'N/A',
      description: description ? String(description).trim() : '',
      isActive: true,
    });

    console.log('✅ Package created successfully:', pkg);

    res.status(201).json({
      success: true,
      package: pkg,
      message: 'Package created successfully',
    });
  } catch (error) {
    console.error('❌ Create package error:', error);

    // Handle Mongoose duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A package with this name already exists',
      });
    }

    // Handle Mongoose validation error
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ') || 'Validation failed',
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
};

// ============================================================
// UPDATE PACKAGE
// PUT /api/packages/:id
// Body: partial { name, bandwidth, sellingPrice, purchasePrice, description, isActive }
// ============================================================
exports.updatePackage = async (req, res) => {
  try {
    const { name, bandwidth, sellingPrice, purchasePrice, description, isActive } = req.body;

    // Build update object — only include fields that were sent
    const update = {};

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
      const val = parseFloat(sellingPrice);
      if (isNaN(val) || val <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Selling price must be greater than 0',
        });
      }
      update.sellingPrice = val;
    }

    if (purchasePrice !== undefined) {
      const val = parseFloat(purchasePrice);
      if (isNaN(val) || val <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Purchase price must be greater than 0',
        });
      }
      update.purchasePrice = val;
    }

    if (description !== undefined) {
      update.description = String(description).trim();
    }

    if (isActive !== undefined) {
      update.isActive = Boolean(isActive);
    }

    // ✅ Recalculate profit if both prices are being updated
    // (If only one is provided, we'll fetch existing and recalc below)
    let needsProfitRecalc = false;
    if (update.sellingPrice !== undefined || update.purchasePrice !== undefined) {
      needsProfitRecalc = true;
    }

    const existing = await Package.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Package not found',
      });
    }

    if (needsProfitRecalc) {
      const newSell = update.sellingPrice !== undefined ? update.sellingPrice : existing.sellingPrice;
      const newCost = update.purchasePrice !== undefined ? update.purchasePrice : existing.purchasePrice;
      update.profit = newSell - newCost;
    }

    const pkg = await Package.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true, runValidators: true }
    );

    if (!pkg) {
      return res.status(404).json({
        success: false,
        message: 'Package not found',
      });
    }

    console.log('✅ Package updated:', pkg);

    res.json({
      success: true,
      package: pkg,
      message: 'Package updated successfully',
    });
  } catch (error) {
    console.error('❌ Update package error:', error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A package with this name already exists',
      });
    }

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ') || 'Validation failed',
      });
    }

    logger.error(`Update package error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

// ============================================================
// DELETE PACKAGE
// DELETE /api/packages/:id
// ============================================================
exports.deletePackage = async (req, res) => {
  try {
    const pkg = await Package.findByIdAndDelete(req.params.id);

    if (!pkg) {
      return res.status(404).json({
        success: false,
        message: 'Package not found',
      });
    }

    console.log('🗑️ Package deleted:', pkg.name);

    res.json({
      success: true,
      message: 'Package deleted successfully',
    });
  } catch (error) {
    logger.error(`Delete package error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};