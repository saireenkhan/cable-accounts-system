const PartnerModel = require('../models/Partner');
const PartnerAreaModel = require('../models/PartnerArea');
const PaymentModel = require('../models/Payment');
const logger = require('../utils/logger');
const tenantScope = require('../utils/tenantScope');
const PartnerPaymentModel = require('../models/PartnerPayment');

// ============================================================
// HELPER: Calculate expiry date (one calendar month later)
// ============================================================
const calculateExpiryDate = (activationDate) => {
  if (!activationDate) return null;

  const date = new Date(activationDate);

  if (Number.isNaN(date.getTime())) return null;

  date.setMonth(date.getMonth() + 1);

  return date;
};

// ============================================================
// HELPER: Area must exist, and (if both have an ISP) belong to it.
// Returns an error message string, or null when valid.
// ============================================================
const validateAreaForIsp = async (PartnerArea, area, isp) => {
  if (!area) return null;

  const areaDoc = await PartnerArea.findOne({ name: area });

  if (!areaDoc) {
    return `Partner area "${area}" not found. Please create it first.`;
  }

  if (
    isp &&
    areaDoc.isp &&
    String(areaDoc.isp).trim().toLowerCase() !==
      String(isp).trim().toLowerCase()
  ) {
    return `Partner area "${area}" does not belong to ISP "${isp}".`;
  }

  return null;
};

// ============================================================
// GET all partners
// ============================================================
exports.getPartners = async (req, res) => {
  const Partner = tenantScope(PartnerModel, req);
  try {
    const { search, status, area, isp, limit } = req.query;
    const filter = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { partnerId: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { partner: { $regex: search, $options: 'i' } },
      ];
    }

    if (status) filter.status = status;
    if (area) filter.area = area;
    if (isp) filter.isp = isp;

    let query = Partner.find(filter)
      .populate('createdBy', 'name')
      .sort({ partnerId: 1 });

    if (limit) {
      query = query.limit(parseInt(limit));
    }

    const partners = await query;

    res.json({
      success: true,
      partners,
    });
  } catch (error) {
    logger.error(`Get partners error: ${error.message}`);

    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// ============================================================
// GET single partner
// ============================================================
exports.getPartner = async (req, res) => {
  const Partner = tenantScope(PartnerModel, req);
  try {
    const partner = await Partner.findById(req.params.id).populate(
      'createdBy',
      'name'
    );

    if (!partner) {
      return res.status(404).json({
        success: false,
        message: 'Partner not found',
      });
    }

    res.json({
      success: true,
      partner,
    });
  } catch (error) {
    logger.error(`Get partner error: ${error.message}`);

    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// ============================================================
// CREATE partner
// ============================================================
exports.createPartner = async (req, res) => {
  const Partner = tenantScope(PartnerModel, req);
  const PartnerArea = tenantScope(PartnerAreaModel, req);
  try {
    const {
      partnerId,
      name,
      phone,
      cnic,
      address,
      area,
      isp,
      partner,
      package: pkg,
      discount,
      monthlyFee,
      status,
      activationDate,
    } = req.body;

    console.log('📝 Creating partner with data:', req.body);

    // Required fields
    if (!partnerId) {
      return res.status(400).json({
        success: false,
        message: 'Partner ID is required',
      });
    }

    if (!name || !phone || !address) {
      return res.status(400).json({
        success: false,
        message: 'Name, phone, and address are required',
      });
    }

    // Duplicate partner ID
    const existingPartnerId = await Partner.findOne({ partnerId });

    if (existingPartnerId) {
      return res.status(400).json({
        success: false,
        message: `Partner ID "${partnerId}" already exists. Please use a different ID.`,
      });
    }

    // Area: must exist and match the chosen ISP
    const areaError = await validateAreaForIsp(PartnerArea, area, isp);

    if (areaError) {
      return res.status(400).json({
        success: false,
        message: areaError,
      });
    }

    // Discount
    const parsedDiscount = parseFloat(discount) || 0;

    if (parsedDiscount < 0) {
      return res.status(400).json({
        success: false,
        message: 'Discount cannot be negative.',
      });
    }

    // Activation + Expiry
    let parsedActivationDate = null;
    let calculatedExpiryDate = null;

    if (activationDate) {
      parsedActivationDate = new Date(activationDate);

      if (Number.isNaN(parsedActivationDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid activation date.',
        });
      }

      calculatedExpiryDate = calculateExpiryDate(parsedActivationDate);
    }

    const partnerDoc = await Partner.create({
      partnerId,
      name,
      phone,
      cnic: cnic || '',
      address,
      area: area || '',
      isp: isp ? String(isp).trim() : '',
      partner: partner || '',
      package: pkg,
      discount: parsedDiscount,
      monthlyFee: parseFloat(monthlyFee) || 0,
      status: status || 'active',
      activationDate: parsedActivationDate,
      expiryDate: calculatedExpiryDate,
      createdBy: req.user ? req.user.id : null,
    });

    const populatedPartner = await Partner.findById(partnerDoc._id).populate(
      'createdBy',
      'name'
    );

    console.log('✅ Partner created:', populatedPartner.partnerId);

    res.status(201).json({
      success: true,
      partner: populatedPartner,
      message: 'Partner created successfully',
    });
  } catch (error) {
    console.error('❌ Create partner error:', error);

    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];

      return res.status(400).json({
        success: false,
        message: `Duplicate ${field}: "${error.keyValue[field]}" already exists. Please try again.`,
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
  const Partner = tenantScope(PartnerModel, req);
  const PartnerArea = tenantScope(PartnerAreaModel, req);
  try {
    const {
      partnerId,
      name,
      phone,
      cnic,
      address,
      area,
      isp,
      partner,
      package: pkg,
      discount,
      monthlyFee,
      status,
      activationDate,
    } = req.body;

    console.log('📝 Updating partner:', req.params.id);
    console.log('📦 Update data:', req.body);

    const existingPartner = await Partner.findById(req.params.id);

    if (!existingPartner) {
      return res.status(404).json({
        success: false,
        message: 'Partner not found',
      });
    }

    const update = {};

    if (partnerId !== undefined) update.partnerId = partnerId;
    if (name !== undefined) update.name = name;
    if (phone !== undefined) update.phone = phone;
    if (cnic !== undefined) update.cnic = cnic;
    if (address !== undefined) update.address = address;
    if (status !== undefined) update.status = status;
    if (partner !== undefined) update.partner = partner;
    if (isp !== undefined) update.isp = String(isp || '').trim();

    // Area — must exist and match the (new or existing) ISP
    if (area !== undefined) {
      if (area) {
        const effectiveIsp =
          isp !== undefined ? isp : existingPartner.isp;

        const areaError = await validateAreaForIsp(
          PartnerArea,
          area,
          effectiveIsp
        );

        if (areaError) {
          return res.status(400).json({
            success: false,
            message: areaError,
          });
        }

        update.area = area;
      } else {
        update.area = '';
      }
    }

    if (pkg !== undefined) update.package = pkg;

    if (discount !== undefined) {
      const parsedDiscount = parseFloat(discount);

      if (Number.isNaN(parsedDiscount) || parsedDiscount < 0) {
        return res.status(400).json({
          success: false,
          message: 'Discount must be a valid non-negative number.',
        });
      }

      update.discount = parsedDiscount;
    }

    if (monthlyFee !== undefined) {
      const parsedMonthlyFee = parseFloat(monthlyFee);

      if (Number.isNaN(parsedMonthlyFee) || parsedMonthlyFee < 0) {
        return res.status(400).json({
          success: false,
          message: 'Monthly fee must be a valid non-negative number.',
        });
      }

      update.monthlyFee = parsedMonthlyFee;
    }

    // Activation + Expiry
    if (activationDate !== undefined) {
      if (!activationDate) {
        update.activationDate = null;
        update.expiryDate = null;
      } else {
        const parsedActivationDate = new Date(activationDate);

        if (Number.isNaN(parsedActivationDate.getTime())) {
          return res.status(400).json({
            success: false,
            message: 'Invalid activation date.',
          });
        }

        update.activationDate = parsedActivationDate;
        update.expiryDate = calculateExpiryDate(parsedActivationDate);
      }
    }

    const partnerDoc = await Partner.findByIdAndUpdate(
      req.params.id,
      update,
      {
        new: true,
        runValidators: true,
      }
    ).populate('createdBy', 'name');

    console.log('✅ Partner updated:', partnerDoc.partnerId);

    res.json({
      success: true,
      partner: partnerDoc,
      message: 'Partner updated successfully',
    });
  } catch (error) {
    console.error('❌ Update partner error:', error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A partner with this ID already exists',
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

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: `Invalid ${error.path}: ${error.value}`,
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
// Cascade: also deletes every partner-payment that belongs
// to this partner so they disappear from Receive Partner Payments.
// ============================================================
exports.deletePartner = async (req, res) => {
  const Partner = tenantScope(PartnerModel, req);
  const PartnerPayment = tenantScope(PartnerPaymentModel, req);

  try {
    const partner = await Partner.findById(req.params.id);

    if (!partner) {
      return res.status(404).json({
        success: false,
        message: 'Partner not found',
      });
    }

    const deleteResult = await PartnerPayment.deleteMany({
      partner: partner._id,
    });

    await Partner.findByIdAndDelete(req.params.id);

    console.log(
      `🗑️ Deleted partner "${partner.name}" (${partner.partnerId}) and ${deleteResult.deletedCount} related payment(s)`
    );

    res.json({
      success: true,
      message: `Partner deleted. ${deleteResult.deletedCount} related payment(s) also removed.`,
      deletedPayments: deleteResult.deletedCount,
    });
  } catch (error) {
    console.error('❌ Delete partner error:', error);
    logger.error(`Delete partner error: ${error.message}`);

    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

// ============================================================
// GET dashboard stats
// ============================================================
exports.getPartnerDashboardStats = async (req, res) => {
  const Partner = tenantScope(PartnerModel, req);
  const Payment = tenantScope(PaymentModel, req);
  try {
    const totalPartners = await Partner.countDocuments();
    const activePartners = await Partner.countDocuments({ status: 'active' });
    const expiredPartners = await Partner.countDocuments({ status: 'expired' });

    const partners = await Partner.find();

    const totalBilling = partners.reduce(
      (sum, p) => sum + (p.monthlyFee || 0),
      0
    );

    const payments = await Payment.find({ isNoPayment: { $ne: true } });

    const totalCollection = payments.reduce(
      (sum, p) => sum + (p.amount || 0),
      0
    );

    const outstanding = Math.max(0, totalBilling - totalCollection);

    const recoveryRate =
      totalBilling > 0 ? (totalCollection / totalBilling) * 100 : 0;

    res.json({
      success: true,
      stats: {
        totalPartners,
        activePartners,
        expiredPartners,
        totalBilling,
        totalCollection,
        outstanding,
        recoveryRate: Math.round(recoveryRate),
      },
    });
  } catch (error) {
    logger.error(`Partner dashboard stats error: ${error.message}`);

    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};