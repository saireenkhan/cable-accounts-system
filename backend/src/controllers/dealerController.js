const DealerModel = require('../models/Dealer');
const DealerPaymentModel = require('../models/DealerPayment');
const DealerAreaModel = require('../models/DealerArea');
const AreaModel = require('../models/Area');
const logger = require('../utils/logger');
const tenantScope = require('../utils/tenantScope');

// ============================================================
// GENERATE DEALER ID
// ============================================================
const generateDealerId = async (Dealer) => {
  const count = await Dealer.countDocuments();
  return `DLR-${String(count + 1).padStart(3, '0')}`;
};

// ============================================================
// RESOLVE AREA
// Accepts either an area name (string), an ObjectId string, or
// an already-populated area object. Returns the Area document,
// creating a new one if the name doesn't exist yet.
// ============================================================
const resolveArea = async (Area, areaInput) => {
  if (!areaInput) return null;

  if (/^[a-f\d]{24}$/i.test(String(areaInput))) {
    const byId = await Area.findById(areaInput);
    if (byId) return byId;
  }

  const name =
    typeof areaInput === 'object' && areaInput.name
      ? areaInput.name
      : String(areaInput);

  let areaDoc = await Area.findOne({ name });
  if (!areaDoc) {
    areaDoc = await Area.create({
      name,
      code: name.substring(0, 3).toUpperCase(),
      isActive: true,
    });
    console.log('✅ Created new area:', areaDoc);
  }
  return areaDoc;
};

// ============================================================
// VALIDATE AREA vs ISP
// If the dealer area exists and has an ISP set, it must match
// the ISP chosen for the dealer. Returns an error message or null.
// ============================================================
const validateAreaForIsp = async (DealerArea, areaInput, isp) => {
  if (!areaInput || !isp) return null;

  const areaName =
    typeof areaInput === 'object' && areaInput.name
      ? areaInput.name
      : String(areaInput);

  const dealerArea = await DealerArea.findOne({ name: areaName });

  if (
    dealerArea &&
    dealerArea.isp &&
    String(dealerArea.isp).trim().toLowerCase() !==
      String(isp).trim().toLowerCase()
  ) {
    return `Area "${areaName}" does not belong to ISP "${isp}".`;
  }

  return null;
};

// ============================================================
// GET ALL DEALERS
// ============================================================
exports.getDealers = async (req, res) => {
  const Dealer = tenantScope(DealerModel, req);

  try {
    const { search, status, isp } = req.query;
    const filter = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { dealerId: { $regex: search, $options: 'i' } },
        { cellNo: { $regex: search, $options: 'i' } },
      ];
    }
    if (status) filter.status = status;
    if (isp) filter.isp = isp;

    const dealers = await Dealer.find(filter)
      .populate('area', 'name')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });

    res.json({ success: true, dealers });
  } catch (error) {
    logger.error(`Get dealers error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ============================================================
// CREATE DEALER
// ============================================================
exports.createDealer = async (req, res) => {
  const Area = tenantScope(AreaModel, req);
  const DealerArea = tenantScope(DealerAreaModel, req);
  const Dealer = tenantScope(DealerModel, req);

  try {
    const {
      dealerId,
      name,
      cellNo,
      area,
      isp,
      address,
      openingBalance,
      remarks,
      commission,
      status,
    } = req.body;

    console.log('📝 Creating dealer with data:', req.body);

    if (!dealerId || !name || !cellNo || !area) {
      return res.status(400).json({
        success: false,
        message: 'Dealer ID, name, cell number, and area are required',
      });
    }

    const existingDealer = await Dealer.findOne({ dealerId });
    if (existingDealer) {
      return res.status(400).json({
        success: false,
        message: `Dealer ID "${dealerId}" already exists. Please use a different ID.`,
      });
    }

    const areaError = await validateAreaForIsp(DealerArea, area, isp);
    if (areaError) {
      return res.status(400).json({ success: false, message: areaError });
    }

    const areaDoc = await resolveArea(Area, area);

    const createdBy = req.user ? req.user.id : null;

    const dealer = await Dealer.create({
      dealerId,
      name,
      cellNo,
      isp: isp ? String(isp).trim() : '',
      area: areaDoc ? areaDoc._id : null,
      address: address || '',
      openingBalance: parseFloat(openingBalance) || 0,
      currentBalance: parseFloat(openingBalance) || 0,
      remarks: remarks || '',
      commission: commission || '10%',
      createdBy,
      status: status || 'active',
    });

    const populatedDealer = await Dealer.findById(dealer._id)
      .populate('area', 'name')
      .populate('createdBy', 'name');

    console.log('✅ Dealer created successfully:', populatedDealer.dealerId);

    res.status(201).json({
      success: true,
      dealer: populatedDealer,
      message: 'Dealer created successfully',
    });
  } catch (error) {
    console.error('❌ Create dealer error:', error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A dealer with this ID already exists',
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

// ============================================================
// UPDATE DEALER
// ============================================================
exports.updateDealer = async (req, res) => {
  const Area = tenantScope(AreaModel, req);
  const DealerArea = tenantScope(DealerAreaModel, req);
  const Dealer = tenantScope(DealerModel, req);

  try {
    const {
      dealerId,
      name,
      cellNo,
      area,
      isp,
      address,
      openingBalance,
      remarks,
      commission,
      status,
    } = req.body;

    console.log('📝 Updating dealer:', req.params.id, req.body);

    const existingDealer = await Dealer.findById(req.params.id);

    if (!existingDealer) {
      return res.status(404).json({
        success: false,
        message: 'Dealer not found',
      });
    }

    const update = {};

    if (dealerId !== undefined) update.dealerId = dealerId;
    if (name !== undefined) update.name = name;
    if (cellNo !== undefined) update.cellNo = cellNo;
    if (address !== undefined) update.address = address || '';
    if (remarks !== undefined) update.remarks = remarks || '';
    if (commission !== undefined) update.commission = commission;
    if (status !== undefined) update.status = status;
    if (isp !== undefined) update.isp = String(isp || '').trim();

    if (openingBalance !== undefined && openingBalance !== '') {
      update.openingBalance = parseFloat(openingBalance) || 0;
    }

    // Resolve area name -> ObjectId (checked against the new or existing ISP)
    if (area) {
      const effectiveIsp = isp !== undefined ? isp : existingDealer.isp;

      const areaError = await validateAreaForIsp(
        DealerArea,
        area,
        effectiveIsp
      );
      if (areaError) {
        return res.status(400).json({ success: false, message: areaError });
      }

      const areaDoc = await resolveArea(Area, area);
      if (areaDoc) update.area = areaDoc._id;
    }

    const dealer = await Dealer.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    })
      .populate('area', 'name')
      .populate('createdBy', 'name');

    console.log('✅ Dealer updated:', dealer.dealerId);

    res.json({
      success: true,
      dealer,
      message: 'Dealer updated successfully',
    });
  } catch (error) {
    console.error('❌ Update dealer error:', error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A dealer with this ID already exists',
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

// ============================================================
// DELETE DEALER
// ============================================================
exports.deleteDealer = async (req, res) => {
  const Dealer = tenantScope(DealerModel, req);

  try {
    const dealer = await Dealer.findByIdAndDelete(req.params.id);

    if (!dealer) {
      return res.status(404).json({
        success: false,
        message: 'Dealer not found',
      });
    }

    res.json({ success: true, message: 'Dealer deleted successfully' });
  } catch (error) {
    logger.error(`Delete dealer error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ============================================================
// GET DEALER STATS
// ============================================================
exports.getDealerStats = async (req, res) => {
  const Dealer = tenantScope(DealerModel, req);
  const DealerPayment = tenantScope(DealerPaymentModel, req);

  try {
    const totalDealers = await Dealer.countDocuments();
    const activeDealers = await Dealer.countDocuments({ status: 'active' });

    const currentMonth = new Date().toLocaleString('default', {
      month: 'long',
      year: 'numeric',
    });

    const dealerPayments = await DealerPayment.aggregate([
      { $match: { month: currentMonth } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    const totalRecovery =
      dealerPayments.length > 0 ? dealerPayments[0].total : 0;

    const dealers = await Dealer.find();
    let totalBilling = 0;
    dealers.forEach((d) => {
      totalBilling += d.currentBalance || 0;
    });

    const outstanding = totalBilling - totalRecovery;

    const dealerWiseRecovery = await DealerPayment.aggregate([
      { $match: { month: currentMonth } },
      {
        $group: {
          _id: '$dealer',
          total: { $sum: '$amount' },
        },
      },
      {
        $lookup: {
          from: 'dealers',
          localField: '_id',
          foreignField: '_id',
          as: 'dealer',
        },
      },
      { $unwind: '$dealer' },
      {
        $project: {
          dealerName: '$dealer.name',
          area: '$dealer.area',
          total: 1,
        },
      },
    ]);

    res.json({
      success: true,
      stats: {
        totalDealers,
        activeDealers,
        totalBilling,
        totalRecovery,
        outstanding,
        recoveryRate:
          totalBilling > 0
            ? ((totalRecovery / totalBilling) * 100).toFixed(1)
            : 0,
        dealerWiseRecovery,
      },
    });
  } catch (error) {
    logger.error(`Get dealer stats error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};