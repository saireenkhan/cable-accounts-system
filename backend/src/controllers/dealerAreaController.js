const DealerArea = require('../models/DealerArea');
const logger = require('../utils/logger');

exports.getDealerAreas = async (req, res) => {
  try {
    const areas = await DealerArea.find();
    res.json({ success: true, areas });
  } catch (error) {
    logger.error(`Get dealer areas error: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createDealerArea = async (req, res) => {
  try {
    const { name, code, description } = req.body;

    console.log('📝 Creating dealer area with data:', req.body);

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Dealer area name is required'
      });
    }

    const existingArea = await DealerArea.findOne({ name });
    if (existingArea) {
      return res.status(400).json({
        success: false,
        message: `Dealer area "${name}" already exists`
      });
    }

    const area = await DealerArea.create({
      name: name.trim(),
      code: code || '',
      description: description || '',
      isActive: true,
      dealers: 0,
    });

    console.log('✅ Dealer area created successfully:', area);

    res.status(201).json({
      success: true,
      area,
      message: 'Dealer area created successfully'
    });
  } catch (error) {
    console.error('❌ Create dealer area error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

exports.updateDealerArea = async (req, res) => {
  try {
    const area = await DealerArea.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!area) {
      return res.status(404).json({ message: 'Dealer area not found' });
    }
    res.json({ success: true, area });
  } catch (error) {
    logger.error(`Update dealer area error: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteDealerArea = async (req, res) => {
  try {
    const area = await DealerArea.findByIdAndDelete(req.params.id);
    if (!area) {
      return res.status(404).json({ message: 'Dealer area not found' });
    }
    res.json({ success: true, message: 'Dealer area deleted successfully' });
  } catch (error) {
    logger.error(`Delete dealer area error: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};