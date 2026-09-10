const InstallationCharge = require('../models/InstallationCharge');
const Customer = require('../models/Customer');
const Area = require('../models/Area');
const logger = require('../utils/logger');

exports.getInstallationCharges = async (req, res) => {
  try {
    const { customerId, status } = req.query;
    const filter = {};
    
    if (customerId) filter.customer = customerId;
    if (status) filter.status = status;

    const charges = await InstallationCharge.find(filter)
      .populate('customer', 'name code phone')
      .populate('area', 'name')
      .populate('createdBy', 'name')
      .sort({ date: -1 });

    res.json({ success: true, charges });
  } catch (error) {
    logger.error(`Get installation charges error: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createInstallationCharge = async (req, res) => {
  try {
    const { customer, area, chargeType, amount, status, date, remarks } = req.body;

    console.log('📝 Creating installation charge with data:', req.body);

    // ✅ Find customer by name
    let customerDoc = await Customer.findOne({ name: customer });
    if (!customerDoc) {
      return res.status(404).json({
        success: false,
        message: `Customer "${customer}" not found. Please add the customer first.`
      });
    }

    // ✅ Find area by name
    let areaDoc = await Area.findOne({ name: area });
    if (!areaDoc) {
      return res.status(404).json({
        success: false,
        message: `Area "${area}" not found. Please add the area first.`
      });
    }

    const charge = await InstallationCharge.create({
      customer: customerDoc._id,
      area: areaDoc._id,
      chargeType: chargeType,
      amount: parseFloat(amount) || 0,
      status: status || 'Unpaid',
      date: date || new Date(),
      remarks: remarks || '',
      createdBy: req.user ? req.user.id : null,
    });

    const populatedCharge = await InstallationCharge.findById(charge._id)
      .populate('customer', 'name code phone')
      .populate('area', 'name')
      .populate('createdBy', 'name');

    console.log('✅ Installation charge created successfully');

    res.status(201).json({
      success: true,
      charge: populatedCharge,
      message: 'Installation charge added successfully',
    });
  } catch (error) {
    console.error('❌ Create installation charge error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

exports.updateInstallationCharge = async (req, res) => {
  try {
    const charge = await InstallationCharge.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!charge) {
      return res.status(404).json({ message: 'Installation charge not found' });
    }
    
    res.json({ success: true, charge });
  } catch (error) {
    logger.error(`Update installation charge error: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteInstallationCharge = async (req, res) => {
  try {
    const charge = await InstallationCharge.findByIdAndDelete(req.params.id);
    if (!charge) {
      return res.status(404).json({ message: 'Installation charge not found' });
    }
    res.json({ success: true, message: 'Installation charge deleted successfully' });
  } catch (error) {
    logger.error(`Delete installation charge error: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};