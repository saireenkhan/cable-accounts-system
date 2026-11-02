const PartnerAreaModel = require('../models/PartnerArea');
const logger = require('../utils/logger');
const tenantScope = require('../utils/tenantScope');
const { ispSelectionRequired } = require('../utils/ispRequirement');

const normalizeIsps = (value) => {
  if (!value) return [];
  const values = Array.isArray(value) ? value : [value];
  return [...new Set(values.map((v) => String(v).trim()).filter(Boolean))];
};

exports.getPartnerAreas = async (req, res) => {
  const PartnerArea = tenantScope(PartnerAreaModel, req);
  try {
    const filter = {};
    if (req.query.isp) {
      const requestedIsps = normalizeIsps(req.query.isp);
      if (requestedIsps.length > 0) filter.isp = { $in: requestedIsps };
    }
    const areas = await PartnerArea.find(filter).sort({ createdAt: -1 });
    return res.json({ success: true, areas });
  } catch (error) {
    logger.error(`Get partner areas error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getPartnerArea = async (req, res) => {
  const PartnerArea = tenantScope(PartnerAreaModel, req);
  try {
    const area = await PartnerArea.findById(req.params.id);
    if (!area) return res.status(404).json({ success: false, message: 'Partner area not found' });
    return res.json({ success: true, area });
  } catch (error) {
    logger.error(`Get partner area error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.createPartnerArea = async (req, res) => {
  const PartnerArea = tenantScope(PartnerAreaModel, req);
  try {
    const { name, code, description, isp } = req.body;
    const areaName = String(name || '').trim();
    if (!areaName) return res.status(400).json({ success: false, message: 'Partner area name is required' });
    const normalizedIsps = normalizeIsps(isp);
    if (normalizedIsps.length === 0 && await ispSelectionRequired(req)) {
      return res.status(400).json({ success: false, message: 'At least one ISP is required for a partner area' });
    }
    const existingArea = await PartnerArea.findOne({ name: areaName });
    if (existingArea) {
      return res.status(400).json({ success: false, message: `Partner area "${areaName}" already exists` });
    }
    const area = await PartnerArea.create({
      name: areaName,
      code: code ? String(code).trim() : '',
      description: description ? String(description).trim() : '',
      isp: normalizedIsps,
      isActive: true,
    });
    return res.status(201).json({ success: true, area, message: 'Partner area created successfully' });
  } catch (error) {
    logger.error(`Create partner area error: ${error.message}`);
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'A partner area with this name already exists' });
    }
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

exports.updatePartnerArea = async (req, res) => {
  const PartnerArea = tenantScope(PartnerAreaModel, req);
  try {
    const { name, code, description, isp, isActive } = req.body;
    const update = {};
    if (name !== undefined) {
      if (!String(name).trim()) {
        return res.status(400).json({ success: false, message: 'Partner area name cannot be empty' });
      }
      update.name = String(name).trim();
    }
    if (code !== undefined) update.code = String(code).trim();
    if (description !== undefined) update.description = String(description).trim();
    if (isp !== undefined) {
      const normalizedIsps = normalizeIsps(isp);
      if (normalizedIsps.length === 0 && await ispSelectionRequired(req)) {
        return res.status(400).json({ success: false, message: 'At least one ISP is required for a partner area' });
      }
      update.isp = normalizedIsps;
    }
    if (isActive !== undefined) update.isActive = Boolean(isActive);
    const area = await PartnerArea.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!area) return res.status(404).json({ success: false, message: 'Partner area not found' });
    return res.json({ success: true, area, message: 'Partner area updated successfully' });
  } catch (error) {
    logger.error(`Update partner area error: ${error.message}`);
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'A partner area with this name already exists' });
    }
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

exports.deletePartnerArea = async (req, res) => {
  const PartnerArea = tenantScope(PartnerAreaModel, req);
  try {
    const area = await PartnerArea.findByIdAndDelete(req.params.id);
    if (!area) return res.status(404).json({ success: false, message: 'Partner area not found' });
    return res.json({ success: true, message: 'Partner area deleted successfully' });
  } catch (error) {
    logger.error(`Delete partner area error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
