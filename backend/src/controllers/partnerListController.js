const PartnerListModel = require('../models/PartnerList');
const logger = require('../utils/logger');
const tenantScope = require('../utils/tenantScope');

// ============================================================
// GET all partners
// ============================================================
exports.getPartners = async (req, res) => {
    const PartnerList = tenantScope(PartnerListModel, req);
  try {
    const { search, status, area } = req.query;
    const filter = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { partnerId: { $regex: search, $options: 'i' } },
        { cellNo: { $regex: search, $options: 'i' } },
      ];
    }

    if (status) filter.status = status;
    if (area) filter.area = area;

    const partners = await PartnerList.find(filter).sort({ partnerId: 1 });

    res.json({ success: true, partners });
  } catch (error) {
    logger.error(`Get partners error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ============================================================
// GET single partner
// ============================================================
exports.getPartner = async (req, res) => {
    const PartnerList = tenantScope(PartnerListModel, req);
  try {
    const partner = await PartnerList.findById(req.params.id);

    if (!partner) {
      return res
        .status(404)
        .json({ success: false, message: 'Partner not found' });
    }

    res.json({ success: true, partner });
  } catch (error) {
    logger.error(`Get partner error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ============================================================
// CREATE partner
// ============================================================
exports.createPartner = async (req, res) => {
    const PartnerList = tenantScope(PartnerListModel, req);
  try {
    const {
      partnerId,
      name,
      cellNo,
      area,
      address,
      openingBalance,
      remarks,
    } = req.body;

    console.log('📝 Creating partner with data:', req.body);

    if (!partnerId || !name || !cellNo) {
      return res.status(400).json({
        success: false,
        message: 'Partner ID, name, and cell no are required',
      });
    }

    // Check duplicate partner ID
    const existingPartnerId = await PartnerList.findOne({ partnerId });
    if (existingPartnerId) {
      return res.status(400).json({
        success: false,
        message: `Partner ID "${partnerId}" already exists. Please use a different ID.`,
      });
    }

    const partner = await PartnerList.create({
      partnerId: partnerId.trim(),
      name: name.trim(),
      cellNo: cellNo.trim(),
      area: area || '',
      address: address || area || '',
      openingBalance: parseFloat(openingBalance) || 0,
      remarks: remarks || '',
      status: 'active',
    });

    console.log('✅ Partner created:', partner.partnerId);

    res.status(201).json({
      success: true,
      partner,
      message: 'Partner created successfully',
    });
  } catch (error) {
    console.error('❌ Create partner error:', error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: `Partner ID "${req.body.partnerId}" already exists`,
      });
    }

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors)
        .map((err) => err.message)
        .join(', ');
      return res.status(400).json({
        success: false,
        message: messages || 'Validation error',
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

// ============================================================
// UPDATE partner
// ============================================================
exports.updatePartner = async (req, res) => {
    const PartnerList = tenantScope(PartnerListModel, req);
  try {
    const {
      partnerId,
      name,
      cellNo,
      area,
      address,
      openingBalance,
      remarks,
      status,
    } = req.body;

    const partner = await PartnerList.findById(req.params.id);
    if (!partner) {
      return res
        .status(404)
        .json({ success: false, message: 'Partner not found' });
    }

    const update = {};
    if (partnerId !== undefined) update.partnerId = partnerId.trim();
    if (name !== undefined) update.name = name.trim();
    if (cellNo !== undefined) update.cellNo = cellNo.trim();
    if (area !== undefined) update.area = area;
    if (address !== undefined) update.address = address;
    if (openingBalance !== undefined)
      update.openingBalance = parseFloat(openingBalance) || 0;
    if (remarks !== undefined) update.remarks = remarks;
    if (status !== undefined) update.status = status;

    const updated = await PartnerList.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      partner: updated,
      message: 'Partner updated successfully',
    });
  } catch (error) {
    logger.error(`Update partner error: ${error.message}`);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A partner with this ID already exists',
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

// ============================================================
// DELETE partner
// ============================================================
exports.deletePartner = async (req, res) => {
    const PartnerList = tenantScope(PartnerListModel, req);
  try {
    const partner = await PartnerList.findByIdAndDelete(req.params.id);

    if (!partner) {
      return res
        .status(404)
        .json({ success: false, message: 'Partner not found' });
    }

    res.json({ success: true, message: 'Partner deleted successfully' });
  } catch (error) {
    logger.error(`Delete partner error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
exports.updatePartner = async (req, res) => {
    const PartnerList = tenantScope(PartnerListModel, req);
  try {
    const {
      partnerId,
      name,
      cellNo,
      area,
      address,
      openingBalance,
      remarks,
      status,
    } = req.body;

    const partner = await PartnerList.findById(req.params.id);
    if (!partner) {
      return res.status(404).json({ success: false, message: 'Partner not found' });
    }

    const update = {};
    // ⚠️ Skipping partnerId and name on purpose (they're locked in UI)
    // If you want to allow them via API, uncomment the two lines below:
    // if (partnerId !== undefined) update.partnerId = partnerId.trim();
    // if (name !== undefined) update.name = name.trim();

    if (cellNo !== undefined) update.cellNo = cellNo.trim();
    if (area !== undefined) update.area = area;
    if (address !== undefined) update.address = address;
    if (openingBalance !== undefined)
      update.openingBalance = parseFloat(openingBalance) || 0;
    if (remarks !== undefined) update.remarks = remarks;
    if (status !== undefined) update.status = status;

    const updated = await PartnerList.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      partner: updated,
      message: 'Partner updated successfully',
    });
  } catch (error) {
    logger.error(`Update partner error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};