const ISP = require('../models/ISP');

// ============================================================
// Get all ISPs
// ============================================================
const getISPs = async (req, res) => {
  try {
    const isps = await ISP.find()
      .sort({ name: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      isps,
    });
  } catch (error) {
    console.error('Error fetching ISPs:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch ISPs',
      error: error.message,
    });
  }
};

// ============================================================
// Get single ISP
// ============================================================
const getISPById = async (req, res) => {
  try {
    const { id } = req.params;

    const isp = await ISP.findById(id);

    if (!isp) {
      return res.status(404).json({
        success: false,
        message: 'ISP not found',
      });
    }

    return res.status(200).json({
      success: true,
      isp,
    });
  } catch (error) {
    console.error('Error fetching ISP:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch ISP',
      error: error.message,
    });
  }
};

// ============================================================
// Create ISP
// ============================================================
const createISP = async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'ISP name is required',
      });
    }

    const existingISP = await ISP.findOne({
      name: {
        $regex: `^${name.replace(
          /[.*+?^${}()|[\]\\]/g,
          '\\$&'
        )}$`,
        $options: 'i',
      },
    });

    if (existingISP) {
      return res.status(409).json({
        success: false,
        message: 'An ISP with this name already exists',
      });
    }

    const isp = await ISP.create({
      name,
    });

    return res.status(201).json({
      success: true,
      message: 'ISP created successfully',
      isp,
    });
  } catch (error) {
    console.error('Error creating ISP:', error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'An ISP with this name already exists',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to create ISP',
      error: error.message,
    });
  }
};

// ============================================================
// Update ISP
// ============================================================
const updateISP = async (req, res) => {
  try {
    const { id } = req.params;
    const name = String(req.body.name || '').trim();

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'ISP name is required',
      });
    }

    const existingISP = await ISP.findOne({
      _id: { $ne: id },
      name: {
        $regex: `^${name.replace(
          /[.*+?^${}()|[\]\\]/g,
          '\\$&'
        )}$`,
        $options: 'i',
      },
    });

    if (existingISP) {
      return res.status(409).json({
        success: false,
        message: 'An ISP with this name already exists',
      });
    }

    const isp = await ISP.findByIdAndUpdate(
      id,
      {
        name,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!isp) {
      return res.status(404).json({
        success: false,
        message: 'ISP not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'ISP updated successfully',
      isp,
    });
  } catch (error) {
    console.error('Error updating ISP:', error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'An ISP with this name already exists',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to update ISP',
      error: error.message,
    });
  }
};

// ============================================================
// Delete ISP
// ============================================================
const deleteISP = async (req, res) => {
  try {
    const { id } = req.params;

    const isp = await ISP.findByIdAndDelete(id);

    if (!isp) {
      return res.status(404).json({
        success: false,
        message: 'ISP not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'ISP deleted successfully',
      isp,
    });
  } catch (error) {
    console.error('Error deleting ISP:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to delete ISP',
      error: error.message,
    });
  }
};

module.exports = {
  getISPs,
  getISPById,
  createISP,
  updateISP,
  deleteISP,
};