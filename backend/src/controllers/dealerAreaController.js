const DealerAreaModel = require('../models/DealerArea');
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
        .map((item) => {
          if (item && typeof item === 'object') {
            return (
              item.name ||
              item.ispName ||
              item.value ||
              ''
            );
          }

          return String(item).trim();
        })
        .map((item) => String(item).trim())
        .filter(Boolean)
    ),
  ];
};

/* ============================================================
   GET ALL DEALER AREAS
============================================================ */

exports.getDealerAreas = async (req, res) => {
  const DealerArea = tenantScope(
    DealerAreaModel,
    req
  );

  try {
    const filter = {};

    /*
      Optional:
      /dealer-areas?isp=Nayatel

      ISP is stored as an array, therefore $in
      is used for filtering.
    */
    if (req.query.isp) {
      const isp = String(
        req.query.isp
      ).trim();

      if (isp) {
        filter.isp = {
          $in: [isp],
        };
      }
    }

    const areas =
      await DealerArea.find(filter)
        .sort({ createdAt: -1 })
        .lean();

    const normalizedAreas =
      areas.map((area) => ({
        ...area,
        isp: normalizeIsps(
          area.isp
        ),
      }));

    return res.json({
      success: true,
      areas: normalizedAreas,
    });
  } catch (error) {
    logger.error(
      `Get dealer areas error: ${error.message}`
    );

    console.error(
      '❌ Get dealer areas error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        'Server error',
    });
  }
};

/* ============================================================
   GET ONE DEALER AREA
============================================================ */

exports.getDealerAreaById = async (
  req,
  res
) => {
  const DealerArea = tenantScope(
    DealerAreaModel,
    req
  );

  try {
    const area =
      await DealerArea.findById(
        req.params.id
      ).lean();

    if (!area) {
      return res.status(404).json({
        success: false,
        message:
          'Dealer area not found',
      });
    }

    area.isp =
      normalizeIsps(area.isp);

    return res.json({
      success: true,
      area,
    });
  } catch (error) {
    logger.error(
      `Get dealer area by ID error: ${error.message}`
    );

    console.error(
      '❌ Get dealer area by ID error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        'Server error',
    });
  }
};

/* ============================================================
   CREATE DEALER AREA
============================================================ */

exports.createDealerArea = async (
  req,
  res
) => {
  const DealerArea = tenantScope(
    DealerAreaModel,
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
      '📝 Creating dealer area with data:',
      req.body
    );

    /* ------------------------------
       Validate name
    ------------------------------ */

    if (
      !name ||
      !String(name).trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Dealer area name is required',
      });
    }

    const trimmedName =
      String(name).trim();

    /* ------------------------------
       Normalize ISPs
    ------------------------------ */

    const normalizedIsps =
      normalizeIsps(isp);

    console.log(
      '📡 Normalized ISPs:',
      normalizedIsps
    );

    if (
      normalizedIsps.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          'At least one ISP is required',
      });
    }

    /* ------------------------------
       Check duplicate area
    ------------------------------ */

    const existingArea =
      await DealerArea.findOne({
        name: trimmedName,
      });

    if (existingArea) {
      return res.status(400).json({
        success: false,
        message:
          `Dealer area "${trimmedName}" already exists`,
      });
    }

    /* ------------------------------
       Create dealer area
    ------------------------------ */

    const area =
      await DealerArea.create({
        name: trimmedName,

        code:
          code !== undefined
            ? String(code).trim()
            : '',

        description:
          description !== undefined
            ? String(
                description
              ).trim()
            : '',

        isp: normalizedIsps,

        isActive: true,

        dealers: 0,
      });

    console.log(
      '✅ Dealer area created successfully:',
      area
    );

    return res.status(201).json({
      success: true,
      area,
      message:
        'Dealer area created successfully',
    });
  } catch (error) {
    console.error(
      '❌ Create dealer area error:',
      error
    );

    logger.error(
      `Create dealer area error: ${error.message}`
    );

    /* ------------------------------
       Duplicate key
    ------------------------------ */

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message:
          'A dealer area with this name already exists',
      });
    }

    /* ------------------------------
       Validation error
    ------------------------------ */

    if (
      error.name ===
      'ValidationError'
    ) {
      const validationMessages =
        Object.values(
          error.errors || {}
        )
          .map(
            (item) =>
              item.message
          )
          .filter(Boolean);

      return res.status(400).json({
        success: false,
        message:
          validationMessages.length > 0
            ? validationMessages.join(
                ', '
              )
            : 'Dealer area validation failed',
      });
    }

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        'Server error',
    });
  }
};

/* ============================================================
   UPDATE DEALER AREA
============================================================ */

exports.updateDealerArea = async (
  req,
  res
) => {
  const DealerArea = tenantScope(
    DealerAreaModel,
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

    console.log(
      '📝 Updating dealer area:',
      req.params.id,
      req.body
    );

    const update = {};

    /* ------------------------------
       Name
    ------------------------------ */

    if (name !== undefined) {
      const trimmedName =
        String(name).trim();

      if (!trimmedName) {
        return res.status(400).json({
          success: false,
          message:
            'Dealer area name cannot be empty',
        });
      }

      update.name =
        trimmedName;
    }

    /* ------------------------------
       Code
    ------------------------------ */

    if (code !== undefined) {
      update.code =
        String(
          code || ''
        ).trim();
    }

    /* ------------------------------
       Description
    ------------------------------ */

    if (
      description !==
      undefined
    ) {
      update.description =
        String(
          description || ''
        ).trim();
    }

    /* ------------------------------
       ISP
    ------------------------------ */

    if (isp !== undefined) {
      const normalizedIsps =
        normalizeIsps(isp);

      console.log(
        '📡 Normalized update ISPs:',
        normalizedIsps
      );

      if (
        normalizedIsps.length === 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            'At least one ISP is required',
        });
      }

      update.isp =
        normalizedIsps;
    }

    /* ------------------------------
       Active status
    ------------------------------ */

    if (
      isActive !==
      undefined
    ) {
      update.isActive =
        Boolean(isActive);
    }

    /* ------------------------------
       Duplicate name check
    ------------------------------ */

    if (update.name) {
      const existingArea =
        await DealerArea.findOne({
          _id: {
            $ne: req.params.id,
          },
          name: update.name,
        });

      if (existingArea) {
        return res.status(400).json({
          success: false,
          message:
            `Dealer area "${update.name}" already exists`,
        });
      }
    }

    /* ------------------------------
       Update
    ------------------------------ */

    const area =
      await DealerArea.findByIdAndUpdate(
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
        message:
          'Dealer area not found',
      });
    }

    const normalizedArea =
      area.toObject();

    normalizedArea.isp =
      normalizeIsps(
        normalizedArea.isp
      );

    console.log(
      '✅ Dealer area updated successfully:',
      normalizedArea
    );

    return res.json({
      success: true,
      area: normalizedArea,
      message:
        'Dealer area updated successfully',
    });
  } catch (error) {
    console.error(
      '❌ Update dealer area error:',
      error
    );

    /* ------------------------------
       Duplicate key
    ------------------------------ */

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message:
          'A dealer area with this name already exists',
      });
    }

    /* ------------------------------
       Validation error
    ------------------------------ */

    if (
      error.name ===
      'ValidationError'
    ) {
      const validationMessages =
        Object.values(
          error.errors || {}
        )
          .map(
            (item) =>
              item.message
          )
          .filter(Boolean);

      return res.status(400).json({
        success: false,
        message:
          validationMessages.length > 0
            ? validationMessages.join(
                ', '
              )
            : 'Dealer area validation failed',
      });
    }

    logger.error(
      `Update dealer area error: ${error.message}`
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        'Server error',
    });
  }
};

/* ============================================================
   DELETE DEALER AREA
============================================================ */

exports.deleteDealerArea = async (
  req,
  res
) => {
  const DealerArea = tenantScope(
    DealerAreaModel,
    req
  );

  try {
    const area =
      await DealerArea.findByIdAndDelete(
        req.params.id
      );

    if (!area) {
      return res.status(404).json({
        success: false,
        message:
          'Dealer area not found',
      });
    }

    return res.json({
      success: true,
      message:
        'Dealer area deleted successfully',
    });
  } catch (error) {
    logger.error(
      `Delete dealer area error: ${error.message}`
    );

    console.error(
      '❌ Delete dealer area error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        'Server error',
    });
  }
};