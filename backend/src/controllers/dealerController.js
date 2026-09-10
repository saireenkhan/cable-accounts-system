const Dealer = require('../models/Dealer');
const DealerPayment = require('../models/DealerPayment');
const Area = require('../models/Area');
const logger = require('../utils/logger');

const generateDealerId = async () => {
  const count = await Dealer.countDocuments();
  return `DLR-${String(count + 1).padStart(3, '0')}`;
};

exports.getDealers = async (req, res) => {
  try {
    const { search, status } = req.query;
    const filter = {};
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { dealerId: { $regex: search, $options: 'i' } },
        { cellNo: { $regex: search, $options: 'i' } },
      ];
    }
    if (status) filter.status = status;

    const dealers = await Dealer.find(filter)
      .populate('area', 'name')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });

    res.json({ success: true, dealers });
  } catch (error) {
    logger.error(`Get dealers error: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createDealer = async (req, res) => {
  try {
    const { 
      dealerId,    // ✅ Get from request
      name, 
      cellNo, 
      area, 
      address, 
      openingBalance, 
      remarks, 
      commission 
    } = req.body;

    console.log('📝 Creating dealer with data:', req.body);

    // ✅ Validate required fields
    if (!dealerId || !name || !cellNo || !area) {
      return res.status(400).json({
        success: false,
        message: 'Dealer ID, name, cell number, and area are required'
      });
    }

    // ✅ Check if dealerId already exists
    const existingDealer = await Dealer.findOne({ dealerId });
    if (existingDealer) {
      return res.status(400).json({
        success: false,
        message: `Dealer ID "${dealerId}" already exists. Please use a different ID.`
      });
    }

    // ✅ Find area by name
    let areaDoc = await Area.findOne({ name: area });
    if (!areaDoc) {
      areaDoc = await Area.create({
        name: area,
        code: area.substring(0, 3).toUpperCase(),
        isActive: true
      });
      console.log('✅ Created new area:', areaDoc);
    }
    
    const createdBy = req.user ? req.user.id : null;

    const dealer = await Dealer.create({
      dealerId,              // ✅ Manual dealer ID
      name,
      cellNo,
      area: areaDoc._id,
      address: address || '',
      openingBalance: parseFloat(openingBalance) || 0,
      currentBalance: parseFloat(openingBalance) || 0,
      remarks: remarks || '',
      commission: commission || '10%',
      createdBy: createdBy,
      status: 'active',
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
    res.status(500).json({ 
      success: false,
      message: error.message || 'Server error',
    });
  }
};
exports.updateDealer = async (req, res) => {
  try {
    const dealer = await Dealer.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!dealer) {
      return res.status(404).json({ message: 'Dealer not found' });
    }
    
    res.json({ success: true, dealer });
  } catch (error) {
    logger.error(`Update dealer error: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteDealer = async (req, res) => {
  try {
    const dealer = await Dealer.findByIdAndDelete(req.params.id);
    if (!dealer) {
      return res.status(404).json({ message: 'Dealer not found' });
    }
    res.json({ success: true, message: 'Dealer deleted successfully' });
  } catch (error) {
    logger.error(`Delete dealer error: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getDealerStats = async (req, res) => {
  try {
    const totalDealers = await Dealer.countDocuments();
    const activeDealers = await Dealer.countDocuments({ status: 'active' });

    const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
    
    const dealerPayments = await DealerPayment.aggregate([
      { $match: { month: currentMonth } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    const totalRecovery = dealerPayments.length > 0 ? dealerPayments[0].total : 0;

    const dealers = await Dealer.find();
    let totalBilling = 0;
    dealers.forEach(d => {
      totalBilling += d.currentBalance;
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
        recoveryRate: totalBilling > 0 ? ((totalRecovery / totalBilling) * 100).toFixed(1) : 0,
        dealerWiseRecovery,
      },
    });
  } catch (error) {
    logger.error(`Get dealer stats error: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};