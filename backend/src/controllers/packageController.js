const Package = require('../models/Package');
const logger = require('../utils/logger');

exports.getPackages = async (req, res) => {
  try {
    const packages = await Package.find();
    res.json({ success: true, packages });
  } catch (error) {
    logger.error(`Get packages error: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createPackage = async (req, res) => {
  try {
    const { name, bandwidth, sellingPrice, purchasePrice, description } = req.body;

    console.log('📝 Creating package with data:', req.body);

    // ✅ Validate required fields
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Package name is required'
      });
    }

    if (!sellingPrice || !purchasePrice) {
      return res.status(400).json({
        success: false,
        message: 'Selling price and purchase price are required'
      });
    }

    // ✅ Check if package already exists
    const existingPackage = await Package.findOne({ name });
    if (existingPackage) {
      return res.status(400).json({
        success: false,
        message: `Package "${name}" already exists`
      });
    }

    const pkg = await Package.create({
      name: name.toUpperCase(),
      sellingPrice: parseFloat(sellingPrice) || 0,
      purchasePrice: parseFloat(purchasePrice) || 0,
      bandwidth: bandwidth || 'N/A',
      description: description || '',
      isActive: true
    });

    console.log('✅ Package created successfully:', pkg);

    res.status(201).json({
      success: true,
      package: pkg,
      message: 'Package created successfully'
    });
  } catch (error) {
    console.error('❌ Create package error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

exports.updatePackage = async (req, res) => {
  try {
    const pkg = await Package.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!pkg) {
      return res.status(404).json({ message: 'Package not found' });
    }
    res.json({ success: true, package: pkg });
  } catch (error) {
    logger.error(`Update package error: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deletePackage = async (req, res) => {
  try {
    const pkg = await Package.findByIdAndDelete(req.params.id);
    if (!pkg) {
      return res.status(404).json({ message: 'Package not found' });
    }
    res.json({ success: true, message: 'Package deleted successfully' });
  } catch (error) {
    logger.error(`Delete package error: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};