const Purchase = require('../models/Purchase');
const logger = require('../utils/logger');

const generatePurchaseNo = async () => {
  const count = await Purchase.countDocuments();
  return `PUR-${String(count + 1).padStart(3, '0')}`;
};

exports.getPurchases = async (req, res) => {
  try {
    const { vendor, status } = req.query;
    const filter = {};
    
    if (vendor) filter.vendor = { $regex: vendor, $options: 'i' };
    if (status) filter.status = status;

    const purchases = await Purchase.find(filter)
      .populate('createdBy', 'name')
      .sort({ purchaseDate: -1 });

    res.json({ success: true, purchases });
  } catch (error) {
    logger.error(`Get purchases error: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createPurchase = async (req, res) => {
  try {
    const { vendor, item, quantity, unit, amount, paidAmount, status, purchaseDate, remarks } = req.body;

    console.log('📝 Creating purchase with data:', req.body);

    const purchaseNo = await generatePurchaseNo();

    const purchase = await Purchase.create({
      purchaseNo,
      vendor,
      item,
      quantity: parseInt(quantity) || 0,
      unit: unit || '',
      amount: parseFloat(amount) || 0,
      paidAmount: parseFloat(paidAmount) || 0,
      status: status?.toLowerCase() || 'pending',
      purchaseDate: purchaseDate || new Date(),
      remarks: remarks || '',
      createdBy: req.user ? req.user.id : null,
    });

    const populatedPurchase = await Purchase.findById(purchase._id)
      .populate('createdBy', 'name');

    console.log('✅ Purchase created successfully:', populatedPurchase.purchaseNo);

    res.status(201).json({
      success: true,
      purchase: populatedPurchase,
      message: 'Purchase added successfully',
    });
  } catch (error) {
    console.error('❌ Create purchase error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

exports.updatePurchase = async (req, res) => {
  try {
    const purchase = await Purchase.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!purchase) {
      return res.status(404).json({ message: 'Purchase not found' });
    }
    
    res.json({ success: true, purchase });
  } catch (error) {
    logger.error(`Update purchase error: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deletePurchase = async (req, res) => {
  try {
    const purchase = await Purchase.findByIdAndDelete(req.params.id);
    if (!purchase) {
      return res.status(404).json({ message: 'Purchase not found' });
    }
    res.json({ success: true, message: 'Purchase deleted successfully' });
  } catch (error) {
    logger.error(`Delete purchase error: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};