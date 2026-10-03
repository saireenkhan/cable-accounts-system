const PartnerAreaModel = require('../models/PartnerArea');
const logger = require('../utils/logger');
const tenantScope = require('../utils/tenantScope');

/* ============================================================
   NORMALIZE ISP VALUES
============================================================ */

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

/* ============================================================
   GET ALL PARTNER AREAS
============================================================ */

exports.getPartnerAreas = async (req, res) => {
  const PartnerArea = tenantScope(
    PartnerAreaModel,
    req
  );

  try {
    const filter = {};

    /*
      Optional:

      /partner-areas?isp=Nayatel

      Since one area can now have multiple ISPs,
      use $in instead of exact equality.
    */
    if (req.query.isp) {
      const requestedIsps = normalizeIsps(
        req.query.isp
      );

      if (requestedIsps.length > 0) {
        filter.isp = {
          $in: requestedIsps,
        };
      }
    }

    const areas = await PartnerArea.find(filter)
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      areas,
    });
  } catch (error) {
    logger.error(
      `Get partner areas error: ${error.message}`
    );

    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

/* ============================================================
   GET SINGLE PARTNER AREA
============================================================ */

exports.getPartnerArea = async (req, res) => {
  const PartnerArea = tenantScope(
    PartnerAreaModel,
    req
  );

  try {
    const area = await PartnerArea.findById(
      req.params.id
    );

    if (!area) {
      return res.status(404).json({
        success: false,
        message: 'Partner area not found',
      });
    }

    res.json({
      success: true,
      area,
    });
  } catch (error) {
    logger.error(
      `Get partner area error: ${error.message}`
    );

    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

/* ============================================================
   CREATE PARTNER AREA
============================================================ */

exports.createPartnerArea = async (req, res) => {
  const PartnerArea = tenantScope(
    PartnerAreaModel,
    req
  );

  try {
    const {
      name,
      code,
      description,
      isp,
    } = req.body;

    console.log(
      '📝 Creating partner area with data:',
      req.body
    );

    /* --------------------------------------------------------
       NAME VALIDATION
    -------------------------------------------------------- */

    if (!name || !String(name).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Partner area name is required',
      });
    }

    /* --------------------------------------------------------
       ISP VALIDATION
    -------------------------------------------------------- */

    const normalizedIsps = normalizeIsps(isp);

    if (normalizedIsps.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          'At least one ISP is required for a partner area',
      });
    }

    /* --------------------------------------------------------
       DUPLICATE AREA CHECK
    -------------------------------------------------------- */

    const areaName = String(name).trim();

    const existingArea =
      await PartnerArea.findOne({
        name: areaName,
      });

    if (existingArea) {
      return res.status(400).json({
        success: false,
        message: `Partner area "${areaName}" already exists`,
      });
    }

    /* --------------------------------------------------------
       CREATE
    -------------------------------------------------------- */

    const area = await PartnerArea.create({
      name: areaName,

      code: code
        ? String(code).trim()
        : '',

      description: description
        ? String(description).trim()
        : '',

      isp: normalizedIsps,

      isActive: true,
    });

    console.log(
      '✅ Partner area created successfully:',
      area
    );

    res.status(201).json({
      success: true,
      area,
      message:
        'Partner area created successfully',
    });
  } catch (error) {
    console.error(
      '❌ Create partner area error:',
      error
    );

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message:
          'A partner area with this name already exists',
      });
    }

    res.status(500).json({
      success: false,
      message:
        error.message || 'Server error',
    });
  }
};

/* ============================================================
   UPDATE PARTNER AREA
============================================================ */

exports.updatePartnerArea = async (req, res) => {
  const PartnerArea = tenantScope(
    PartnerAreaModel,
    req
  );

  try {
    const {
      name,
      code,
      description,
      isp,
      isActive,
    } = req.body;

    const update = {};

    /* --------------------------------------------------------
       NAME
    -------------------------------------------------------- */

    if (name !== undefined) {
      if (!String(name).trim()) {
        return res.status(400).json({
          success: false,
          message:
            'Partner area name cannot be empty',
        });
      }

      update.name = String(name).trim();
    }

    /* --------------------------------------------------------
       CODE
    -------------------------------------------------------- */

    if (code !== undefined) {
      update.code = String(code).trim();
    }

    /* --------------------------------------------------------
       DESCRIPTION
    -------------------------------------------------------- */

    if (description !== undefined) {
      update.description =
        String(description).trim();
    }

    /* --------------------------------------------------------
       ISP
    -------------------------------------------------------- */

    if (isp !== undefined) {
      const normalizedIsps =
        normalizeIsps(isp);

      if (normalizedIsps.length === 0) {
        return res.status(400).json({
          success: false,
          message:
            'At least one ISP is required for a partner area',
        });
      }

      update.isp = normalizedIsps;
    }

    /* --------------------------------------------------------
       ACTIVE STATUS
    -------------------------------------------------------- */

    if (isActive !== undefined) {
      update.isActive = Boolean(isActive);
    }

    /* --------------------------------------------------------
       UPDATE
    -------------------------------------------------------- */

    const area =
      await PartnerArea.findByIdAndUpdate(
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
        message: 'Partner area not found',
      });
    }

    res.json({
      success: true,
      area,
      message:
        'Partner area updated successfully',
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message:
          'A partner area with this name already exists',
      });
    }

    logger.error(
      `Update partner area error: ${error.message}`
    );

    res.status(500).json({
      success: false,
      message:
        error.message || 'Server error',
    });
  }
};

/* ============================================================
   DELETE PARTNER AREA
============================================================ */

exports.deletePartnerArea = async (req, res) => {
  const PartnerArea = tenantScope(
    PartnerAreaModel,
    req
  );

  try {
    const area =
      await PartnerArea.findByIdAndDelete(
        req.params.id
      );

    if (!area) {
      return res.status(404).json({
        success: false,
        message:
          'Partner area not found',
      });
    }

    res.json({
      success: true,
      message:
        'Partner area deleted successfully',
    });
  } catch (error) {
    logger.error(
      `Delete partner area error: ${error.message}`
    );

    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};