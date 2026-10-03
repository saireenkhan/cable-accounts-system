const DealerAreaModel = require('../models/DealerArea');
const logger = require('../utils/logger');
const tenantScope = require('../utils/tenantScope');

// Get all dealer areas
exports.getDealerAreas = async (req, res) => {
  const DealerArea = tenantScope(DealerAreaModel, req);
  try {
    const filter = {};

    // Optional: /dealer-areas?isp=Nayatel
    if (req.query.isp) filter.isp = req.query.isp;

    const areas = await DealerArea.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, areas });
  } catch (error) {
    logger.error(`Get dealer areas error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Create dealer area
exports.createDealerArea = async (req, res) => {
  const DealerArea = tenantScope(DealerAreaModel, req);
  try {
    const { name, code, description, isp } = req.body;

    console.log('📝 Creating dealer area with data:', req.body);

    if (!name || !String(name).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Dealer area name is required',
      });
    }

    const trimmedName = String(name).trim();

    const existingArea = await DealerArea.findOne({ name: trimmedName });
    if (existingArea) {
      return res.status(400).json({
        success: false,
        message: `Dealer area "${trimmedName}" already exists`,
      });
    }

    const area = await DealerArea.create({
      name: trimmedName,
      code: code ? String(code).trim() : '',
      description: description ? String(description).trim() : '',
      isp: isp ? String(isp).trim() : '',
      isActive: true,
      dealers: 0,
    });

    console.log('✅ Dealer area created successfully:', area);

    res.status(201).json({
      success: true,
      area,
      message: 'Dealer area created successfully',
    });
  } catch (error) {
    console.error('❌ Create dealer area error:', error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A dealer area with this name already exists',
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

// Update dealer area
exports.updateDealerArea = async (req, res) => {
  const DealerArea = tenantScope(DealerAreaModel, req);
  try {
    const { name, code, description, isp, isActive } = req.body;

    // Only whitelisted fields are updated (no raw req.body)
    const update = {};

    if (name !== undefined) {
      if (!String(name).trim()) {
        return res.status(400).json({
          success: false,
          message: 'Dealer area name cannot be empty',
        });
      }
      update.name = String(name).trim();
    }

    if (code !== undefined) update.code = String(code || '').trim();
    if (description !== undefined)
      update.description = String(description || '').trim();
    if (isp !== undefined) update.isp = String(isp || '').trim();
    if (isActive !== undefined) update.isActive = Boolean(isActive);

    const area = await DealerArea.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    });

    if (!area) {
      return res.status(404).json({
        success: false,
        message: 'Dealer area not found',
      });
    }

    res.json({
      success: true,
      area,
      message: 'Dealer area updated successfully',
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A dealer area with this name already exists',
      });
    }

    logger.error(`Update dealer area error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

// Delete dealer area
exports.deleteDealerArea = async (req, res) => {
  const DealerArea = tenantScope(DealerAreaModel, req);
  try {
    const area = await DealerArea.findByIdAndDelete(req.params.id);
    if (!area) {
      return res.status(404).json({
        success: false,
        message: 'Dealer area not found',
      });
    }
    res.json({ success: true, message: 'Dealer area deleted successfully' });
  } catch (error) {
    logger.error(`Delete dealer area error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};