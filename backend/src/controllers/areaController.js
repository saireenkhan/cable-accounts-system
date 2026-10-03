const AreaModel = require('../models/Area');
const logger = require('../utils/logger');
const tenantScope = require('../utils/tenantScope');

const normalizeIsps = (value) => {
  if (!value) return [];

  const values = Array.isArray(value)
    ? value
    : [value];

  return [
    ...new Set(
      values
        .map((item) => String(item).trim())
        .filter(Boolean)
    ),
  ];
};

// ============================================================
// GET AREAS
// ============================================================

exports.getAreas = async (req, res) => {
  const Area = tenantScope(AreaModel, req);

  try {
    const areas = await Area.find();

    res.json({
      success: true,
      areas,
    });
  } catch (error) {
    logger.error(`Get areas error: ${error.message}`);

    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// ============================================================
// CREATE AREA
// ============================================================

exports.createArea = async (req, res) => {
  const Area = tenantScope(AreaModel, req);

  try {
    const {
      name,
      code,
      description,
      isp,
    } = req.body;

    console.log(
      '📝 Creating area with data:',
      req.body
    );

    // Validate required fields
    if (!name || !String(name).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Area name is required',
      });
    }

    const normalizedIsps = normalizeIsps(isp);

    // ISP is required
    if (normalizedIsps.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one ISP is required',
      });
    }

    // Check duplicate area
    const existingArea = await Area.findOne({
      name: String(name).trim(),
    });

    if (existingArea) {
      return res.status(400).json({
        success: false,
        message: `Area "${name}" already exists`,
      });
    }

    const area = await Area.create({
      name: String(name).trim(),
      code: code ? String(code).trim() : '',
      description: description
        ? String(description).trim()
        : '',
      isp: normalizedIsps,
      isActive: true,
    });

    console.log(
      '✅ Area created successfully:',
      area
    );

    res.status(201).json({
      success: true,
      area,
      message: 'Area created successfully',
    });
  } catch (error) {
    console.error(
      '❌ Create area error:',
      error
    );

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'An area with this name already exists',
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
// UPDATE AREA
// ============================================================

exports.updateArea = async (req, res) => {
  const Area = tenantScope(AreaModel, req);

  try {
    const {
      name,
      code,
      description,
      isp,
      isActive,
    } = req.body;

    const update = {};

    if (name !== undefined) {
      if (!String(name).trim()) {
        return res.status(400).json({
          success: false,
          message: 'Area name cannot be empty',
        });
      }

      update.name = String(name).trim();
    }

    if (code !== undefined) {
      update.code = String(code).trim();
    }

    if (description !== undefined) {
      update.description =
        String(description).trim();
    }

    if (isp !== undefined) {
      const normalizedIsps =
        normalizeIsps(isp);

      if (normalizedIsps.length === 0) {
        return res.status(400).json({
          success: false,
          message:
            'At least one ISP is required',
        });
      }

      update.isp = normalizedIsps;
    }

    if (isActive !== undefined) {
      update.isActive = Boolean(isActive);
    }

    const area =
      await Area.findByIdAndUpdate(
        req.params.id,
        update,
        {
          new: true,
          runValidators: true,
        }
      );

    if (!area) {
      return res.status(404).json({
        success: false,
        message: 'Area not found',
      });
    }

    res.json({
      success: true,
      area,
      message: 'Area updated successfully',
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message:
          'An area with this name already exists',
      });
    }

    logger.error(
      `Update area error: ${error.message}`
    );

    res.status(500).json({
      success: false,
      message:
        error.message || 'Server error',
    });
  }
};

// ============================================================
// DELETE AREA
// ============================================================

exports.deleteArea = async (req, res) => {
  const Area = tenantScope(AreaModel, req);

  try {
    const area =
      await Area.findByIdAndDelete(
        req.params.id
      );

    if (!area) {
      return res.status(404).json({
        success: false,
        message: 'Area not found',
      });
    }

    res.json({
      success: true,
      message: 'Area deleted successfully',
    });
  } catch (error) {
    logger.error(
      `Delete area error: ${error.message}`
    );

    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};