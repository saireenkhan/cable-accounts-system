const AreaModel = require('../models/Area');
const logger = require('../utils/logger');
const tenantScope = require('../utils/tenantScope');
const { ispSelectionRequired } = require('../utils/ispRequirement');

const normalizeIsps = (value) => {
  if (!value) return [];
  const values = Array.isArray(value) ? value : [value];
  return [...new Set(values.map((v) => String(v).trim()).filter(Boolean))];
};

exports.getAreas = async (req, res) => {
  const Area = tenantScope(AreaModel, req);
  try {
    const areas = await Area.find();
    return res.json({ success: true, areas });
  } catch (error) {
    logger.error(`Get areas error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.createArea = async (req, res) => {
  const Area = tenantScope(AreaModel, req);
  try {
    const { name, code, description, isp } = req.body;
    const areaName = String(name || '').trim();
    if (!areaName) {
      return res.status(400).json({ success: false, message: 'Area name is required' });
    }
    const normalizedIsps = normalizeIsps(isp);
    if (normalizedIsps.length === 0 && await ispSelectionRequired(req)) {
      return res.status(400).json({ success: false, message: 'At least one ISP is required' });
    }
    const existingArea = await Area.findOne({ name: areaName });
    if (existingArea) {
      return res.status(400).json({ success: false, message: `Area "${areaName}" already exists` });
    }
    const area = await Area.create({
      name: areaName,
      code: code ? String(code).trim() : '',
      description: description ? String(description).trim() : '',
      isp: normalizedIsps,
      isActive: true,
    });
    return res.status(201).json({ success: true, area, message: 'Area created successfully' });
  } catch (error) {
    logger.error(`Create area error: ${error.message}`);
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'An area with this name already exists' });
    }
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

exports.updateArea = async (req, res) => {
  const Area = tenantScope(AreaModel, req);
  try {
    const { name, code, description, isp, isActive } = req.body;
    const update = {};
    if (name !== undefined) {
      if (!String(name).trim()) {
        return res.status(400).json({ success: false, message: 'Area name cannot be empty' });
      }
      update.name = String(name).trim();
    }
    if (code !== undefined) update.code = String(code).trim();
    if (description !== undefined) update.description = String(description).trim();
    if (isp !== undefined) {
      const normalizedIsps = normalizeIsps(isp);
      if (normalizedIsps.length === 0 && await ispSelectionRequired(req)) {
        return res.status(400).json({ success: false, message: 'At least one ISP is required' });
      }
      update.isp = normalizedIsps;
    }
    if (isActive !== undefined) update.isActive = Boolean(isActive);
    const area = await Area.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!area) return res.status(404).json({ success: false, message: 'Area not found' });
    return res.json({ success: true, area, message: 'Area updated successfully' });
  } catch (error) {
    logger.error(`Update area error: ${error.message}`);
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'An area with this name already exists' });
    }
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

exports.deleteArea = async (req, res) => {
  const Area = tenantScope(AreaModel, req);
  try {
    const area = await Area.findByIdAndDelete(req.params.id);
    if (!area) return res.status(404).json({ success: false, message: 'Area not found' });
    return res.json({ success: true, message: 'Area deleted successfully' });
  } catch (error) {
    logger.error(`Delete area error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
