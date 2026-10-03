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
// NORMALIZE ISP VALUES
// Supports:
// - "NBB"
// - ["NBB", "galaxy"]
// - [{ name: "NBB" }]
// - populated/object ISP values
// ============================================================
const normalizeIsps = (value) => {
  if (!value) return [];

  const values = Array.isArray(value) ? value : [value];

  return [
    ...new Set(
      values
        .map((item) => {
          if (item === null || item === undefined) return '';

          if (typeof item === 'object') {
            return String(
              item.name ||
                item.ispName ||
                item.isp ||
                item.title ||
                ''
            ).trim();
          }

          return String(item).trim();
        })
        .filter(Boolean)
    ),
  ];
};

// ============================================================
// RESOLVE AREA
// Accepts either:
// - area name string
// - ObjectId string
// - populated area object
//
// Returns the Area document, creating a new one if the
// name doesn't exist yet.
// ============================================================
const resolveArea = async (Area, areaInput) => {
  if (!areaInput) return null;

  // If ObjectId was supplied
  if (/^[a-f\d]{24}$/i.test(String(areaInput))) {
    const byId = await Area.findById(areaInput);

    if (byId) {
      return byId;
    }
  }

  const name =
    typeof areaInput === 'object' && areaInput.name
      ? String(areaInput.name).trim()
      : String(areaInput).trim();

  if (!name) {
    return null;
  }

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
//
// IMPORTANT:
// DealerArea.isp can now be:
//   ["NBB", "galaxy"]
//
// It can also still be an old string:
//   "NBB"
//
// The selected dealer ISP must exist inside the Area ISP list.
// ============================================================
const validateAreaForIsp = async (DealerArea, areaInput, isp) => {
  // If either value is missing, there is nothing to validate
  if (!areaInput || !isp) {
    return null;
  }

  const areaName =
    typeof areaInput === 'object' && areaInput.name
      ? String(areaInput.name).trim()
      : String(areaInput).trim();

  const selectedIsp = String(isp).trim();

  if (!areaName || !selectedIsp) {
    return null;
  }

  // First try exact area name
  let dealerArea = await DealerArea.findOne({
    name: areaName,
  });

  // If the input is an ObjectId, also support lookup by ID
  if (!dealerArea && /^[a-f\d]{24}$/i.test(areaName)) {
    dealerArea = await DealerArea.findById(areaName);
  }

  // Area does not exist in DealerArea collection.
  // resolveArea() may create/read it from the old Area collection.
  // Therefore don't reject it here.
  if (!dealerArea) {
    return null;
  }

  // Convert both old string and new array formats into arrays
  const areaIsps = normalizeIsps(dealerArea.isp);

  // If the DealerArea has no ISP assigned, don't reject it here.
  // The Area page should normally prevent this, but this keeps
  // existing old records readable.
  if (areaIsps.length === 0) {
    return null;
  }

  const normalizedSelectedIsp = selectedIsp.toLowerCase();

  const belongsToIsp = areaIsps.some(
    (areaIsp) =>
      String(areaIsp).trim().toLowerCase() ===
      normalizedSelectedIsp
  );

  if (!belongsToIsp) {
    return `Area "${areaName}" does not belong to ISP "${selectedIsp}".`;
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

    if (status) {
      filter.status = status;
    }

    if (isp) {
      filter.isp = isp;
    }

    const dealers = await Dealer.find(filter)
      .populate('area', 'name')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      dealers,
    });
  } catch (error) {
    logger.error(`Get dealers error: ${error.message}`);

    res.status(500).json({
      success: false,
      message: 'Server error',
    });
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
        message:
          'Dealer ID, name, cell number, and area are required',
      });
    }

    const existingDealer = await Dealer.findOne({
      dealerId,
    });

    if (existingDealer) {
      return res.status(400).json({
        success: false,
        message: `Dealer ID "${dealerId}" already exists. Please use a different ID.`,
      });
    }

    // ========================================================
    // VALIDATE SELECTED AREA AGAINST SELECTED ISP
    // ========================================================
    const areaError = await validateAreaForIsp(
      DealerArea,
      area,
      isp
    );

    if (areaError) {
      return res.status(400).json({
        success: false,
        message: areaError,
      });
    }

    // ========================================================
    // RESOLVE AREA
    // ========================================================
    const areaDoc = await resolveArea(Area, area);

    const createdBy = req.user ? req.user.id : null;

    // ========================================================
    // CREATE DEALER
    // Dealer ISP remains SINGLE ISP.
    // ========================================================
    const dealer = await Dealer.create({
      dealerId: String(dealerId).trim(),
      name: String(name).trim(),
      cellNo: String(cellNo).trim(),

      isp: isp
        ? String(isp).trim()
        : '',

      area: areaDoc ? areaDoc._id : null,

      address: address
        ? String(address).trim()
        : '',

      openingBalance:
        parseFloat(openingBalance) || 0,

      currentBalance:
        parseFloat(openingBalance) || 0,

      remarks: remarks
        ? String(remarks).trim()
        : '',

      commission:
        commission || '10%',

      createdBy,

      status:
        status || 'active',
    });

    const populatedDealer = await Dealer.findById(
      dealer._id
    )
      .populate('area', 'name')
      .populate('createdBy', 'name');

    console.log(
      '✅ Dealer created successfully:',
      populatedDealer.dealerId
    );

    res.status(201).json({
      success: true,
      dealer: populatedDealer,
      message: 'Dealer created successfully',
    });
  } catch (error) {
    console.error(
      '❌ Create dealer error:',
      error
    );

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message:
          'A dealer with this ID already exists',
      });
    }

    res.status(500).json({
      success: false,
      message:
        error.message || 'Server error',
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

    console.log(
      '📝 Updating dealer:',
      req.params.id,
      req.body
    );

    const existingDealer = await Dealer.findById(
      req.params.id
    );

    if (!existingDealer) {
      return res.status(404).json({
        success: false,
        message: 'Dealer not found',
      });
    }

    const update = {};

    if (dealerId !== undefined) {
      update.dealerId = String(dealerId).trim();
    }

    if (name !== undefined) {
      update.name = String(name).trim();
    }

    if (cellNo !== undefined) {
      update.cellNo = String(cellNo).trim();
    }

    if (address !== undefined) {
      update.address = address
        ? String(address).trim()
        : '';
    }

    if (remarks !== undefined) {
      update.remarks = remarks
        ? String(remarks).trim()
        : '';
    }

    if (commission !== undefined) {
      update.commission = commission;
    }

    if (status !== undefined) {
      update.status = status;
    }

    // Dealer ISP remains a SINGLE value
    if (isp !== undefined) {
      update.isp = String(isp || '').trim();
    }

    if (
      openingBalance !== undefined &&
      openingBalance !== ''
    ) {
      update.openingBalance =
        parseFloat(openingBalance) || 0;
    }

    // ========================================================
    // RESOLVE AREA
    // Validate against new ISP or existing ISP
    // ========================================================
    if (area) {
      const effectiveIsp =
        isp !== undefined
          ? isp
          : existingDealer.isp;

      const areaError =
        await validateAreaForIsp(
          DealerArea,
          area,
          effectiveIsp
        );

      if (areaError) {
        return res.status(400).json({
          success: false,
          message: areaError,
        });
      }

      const areaDoc =
        await resolveArea(Area, area);

      if (areaDoc) {
        update.area = areaDoc._id;
      }
    }

    const dealer =
      await Dealer.findByIdAndUpdate(
        req.params.id,
        update,
        {
          new: true,
          runValidators: true,
        }
      )
        .populate('area', 'name')
        .populate('createdBy', 'name');

    if (!dealer) {
      return res.status(404).json({
        success: false,
        message: 'Dealer not found',
      });
    }

    console.log(
      '✅ Dealer updated:',
      dealer.dealerId
    );

    res.json({
      success: true,
      dealer,
      message: 'Dealer updated successfully',
    });
  } catch (error) {
    console.error(
      '❌ Update dealer error:',
      error
    );

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message:
          'A dealer with this ID already exists',
      });
    }

    res.status(500).json({
      success: false,
      message:
        error.message || 'Server error',
    });
  }
};

// ============================================================
// DELETE DEALER
// ============================================================
exports.deleteDealer = async (req, res) => {
  const Dealer = tenantScope(DealerModel, req);

  try {
    const dealer =
      await Dealer.findByIdAndDelete(
        req.params.id
      );

    if (!dealer) {
      return res.status(404).json({
        success: false,
        message: 'Dealer not found',
      });
    }

    res.json({
      success: true,
      message: 'Dealer deleted successfully',
    });
  } catch (error) {
    logger.error(
      `Delete dealer error: ${error.message}`
    );

    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// ============================================================
// GET DEALER STATS
// ============================================================
exports.getDealerStats = async (req, res) => {
  const Dealer = tenantScope(DealerModel, req);
  const DealerPayment =
    tenantScope(DealerPaymentModel, req);

  try {
    const totalDealers =
      await Dealer.countDocuments();

    const activeDealers =
      await Dealer.countDocuments({
        status: 'active',
      });

    const currentMonth =
      new Date().toLocaleString(
        'default',
        {
          month: 'long',
          year: 'numeric',
        }
      );

    const dealerPayments =
      await DealerPayment.aggregate([
        {
          $match: {
            month: currentMonth,
          },
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: '$amount',
            },
          },
        },
      ]);

    const totalRecovery =
      dealerPayments.length > 0
        ? dealerPayments[0].total
        : 0;

    const dealers =
      await Dealer.find();

    let totalBilling = 0;

    dealers.forEach((d) => {
      totalBilling +=
        d.currentBalance || 0;
    });

    const outstanding =
      totalBilling - totalRecovery;

    const dealerWiseRecovery =
      await DealerPayment.aggregate([
        {
          $match: {
            month: currentMonth,
          },
        },
        {
          $group: {
            _id: '$dealer',
            total: {
              $sum: '$amount',
            },
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
        {
          $unwind: '$dealer',
        },
        {
          $project: {
            dealerName:
              '$dealer.name',
            area:
              '$dealer.area',
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
            ? (
                (totalRecovery /
                  totalBilling) *
                100
              ).toFixed(1)
            : 0,
        dealerWiseRecovery,
      },
    });
  } catch (error) {
    logger.error(
      `Get dealer stats error: ${error.message}`
    );

    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};