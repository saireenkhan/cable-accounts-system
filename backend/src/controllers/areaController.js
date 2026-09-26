const AreaModel = require('../models/Area');
const logger = require('../utils/logger');
const tenantScope = require('../utils/tenantScope');

exports.getAreas = async (req, res) => {
    const Area = tenantScope(AreaModel, req);
  try {
    const areas = await Area.find();
    res.json({ success: true, areas });
  } catch (error) {
    logger.error(`Get areas error: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createArea = async (req, res) => {
    const Area = tenantScope(AreaModel, req);
  try {
    const { name, code, description } = req.body;
    
    console.log('📝 Creating area with data:', req.body);
    
    // ✅ Validate required fields
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Area name is required'
      });
    }
    
    // ✅ Check if area already exists
    const existingArea = await Area.findOne({ name });
    if (existingArea) {
      return res.status(400).json({
        success: false,
        message: `Area "${name}" already exists`
      });
    }
    
    const area = await Area.create({
      name: name.trim(),
      code: code || '',
      description: description || '',
      isActive: true
    });
    
    console.log('✅ Area created successfully:', area);
    
    res.status(201).json({
      success: true,
      area,
      message: 'Area created successfully'
    });
  } catch (error) {
    console.error('❌ Create area error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

exports.updateArea = async (req, res) => {
    const Area = tenantScope(AreaModel, req);
  try {
    const { name, code, description, isActive } = req.body;

    const update = {};

    if (name !== undefined) {
      if (!String(name).trim()) {
        return res.status(400).json({
          success: false,
          message: 'Area name cannot be empty',
        });
      }
      update.name = String(name).trim();
    }

    if (code !== undefined) {
      update.code = String(code).trim();
    }

    if (description !== undefined) {
      update.description = String(description).trim();
    }

    if (isActive !== undefined) {
      update.isActive = Boolean(isActive);
    }

    const area = await Area.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true, runValidators: true }
    );

    if (!area) {
      return res.status(404).json({
        success: false,
        message: 'Area not found',
      });
    }

    res.json({
      success: true,
      area,
      message: 'Area updated successfully',
    });
  } catch (error) {
    // Handle duplicate name
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'An area with this name already exists',
      });
    }

    logger.error(`Update area error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

exports.deleteArea = async (req, res) => {
    const Area = tenantScope(AreaModel, req);
  try {
    const area = await Area.findByIdAndDelete(req.params.id);
    if (!area) {
      return res.status(404).json({ message: 'Area not found' });
    }
    res.json({ success: true, message: 'Area deleted successfully' });
  } catch (error) {
    logger.error(`Delete area error: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};