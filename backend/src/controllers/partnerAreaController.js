const PartnerAreaModel = require('../models/PartnerArea');
const logger = require('../utils/logger');
const tenantScope = require('../utils/tenantScope');

// ✅ Get all partner areas
exports.getPartnerAreas = async (req, res) => {
    const PartnerArea = tenantScope(PartnerAreaModel, req);
  try {
    const areas = await PartnerArea.find().sort({ createdAt: -1 });
    res.json({ success: true, areas });
  } catch (error) {
    logger.error(`Get partner areas error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ✅ Get single partner area by ID
exports.getPartnerArea = async (req, res) => {
    const PartnerArea = tenantScope(PartnerAreaModel, req);
  try {
    const area = await PartnerArea.findById(req.params.id);
    if (!area) {
      return res.status(404).json({
        success: false,
        message: 'Partner area not found',
      });
    }
    res.json({ success: true, area });
  } catch (error) {
    logger.error(`Get partner area error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ✅ Create partner area
exports.createPartnerArea = async (req, res) => {
    const PartnerArea = tenantScope(PartnerAreaModel, req);
  try {
    const { name, code, description } = req.body;

    console.log('📝 Creating partner area with data:', req.body);

    if (!name || !String(name).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Partner area name is required',
      });
    }

    const existingArea = await PartnerArea.findOne({
      name: String(name).trim(),
    });
    if (existingArea) {
      return res.status(400).json({
        success: false,
        message: `Partner area "${name}" already exists`,
      });
    }

    const area = await PartnerArea.create({
      name: String(name).trim(),
      code: code ? String(code).trim() : '',
      description: description ? String(description).trim() : '',
      isActive: true,
    });

    console.log('✅ Partner area created successfully:', area);

    res.status(201).json({
      success: true,
      area,
      message: 'Partner area created successfully',
    });
  } catch (error) {
    console.error('❌ Create partner area error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

// ✅ Update partner area
exports.updatePartnerArea = async (req, res) => {
    const PartnerArea = tenantScope(PartnerAreaModel, req);
  try {
    const { name, code, description, isActive } = req.body;

    const update = {};

    if (name !== undefined) {
      if (!String(name).trim()) {
        return res.status(400).json({
          success: false,
          message: 'Partner area name cannot be empty',
        });
      }
      update.name = String(name).trim();
    }

    if (code !== undefined) update.code = String(code).trim();
    if (description !== undefined)
      update.description = String(description).trim();
    if (isActive !== undefined) update.isActive = Boolean(isActive);

    const area = await PartnerArea.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    });

    if (!area) {
      return res.status(404).json({
        success: false,
        message: 'Partner area not found',
      });
    }

    res.json({
      success: true,
      area,
      message: 'Partner area updated successfully',
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A partner area with this name already exists',
      });
    }

    logger.error(`Update partner area error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

// ✅ Delete partner area
exports.deletePartnerArea = async (req, res) => {
    const PartnerArea = tenantScope(PartnerAreaModel, req);
  try {
    const area = await PartnerArea.findByIdAndDelete(req.params.id);
    if (!area) {
      return res.status(404).json({
        success: false,
        message: 'Partner area not found',
      });
    }
    res.json({
      success: true,
      message: 'Partner area deleted successfully',
    });
  } catch (error) {
    logger.error(`Delete partner area error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};