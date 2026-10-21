
const express = require("express");
const router = express.Router();

const requireMaster = require("../middleware/requireMaster");
const MasterPackage = require("../models/MasterPackage");
const { PACKAGE_PAGES, ALLOWED_ROUTES } = require("../config/packagePages");

router.use(requireMaster);

// All available admin-panel pages
router.get("/pages", (req, res) => {
  res.json({ success: true, pages: PACKAGE_PAGES });
});

// List packages
router.get("/", async (req, res) => {
  try {
    const packages = await MasterPackage.find()
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, packages });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to load packages" });
  }
});

function validatePackage(body) {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const description = typeof body.description === "string"
    ? body.description.trim() : "";

  const price = Number(body.monthlyPrice);
  const allowedPages = body.allowedPages;

  if (!name || name.length > 100) {
    return { error: "Valid package name is required" };
  }

  if (!Number.isFinite(price) || price < 0) {
    return { error: "Invalid monthly price" };
  }

  if (!Array.isArray(allowedPages) || !allowedPages.length) {
    return { error: "Select at least one page" };
  }

  if (
    allowedPages.some(
      route => typeof route !== "string" || !ALLOWED_ROUTES.has(route)
    )
  ) {
    return { error: "Package contains an invalid page" };
  }

  return {
    value: {
      name,
      description,
      monthlyPrice: price,
      allowedPages: [...new Set(allowedPages)],
      isActive: body.isActive !== false,
    },
  };
}

// Create package
router.post("/", async (req, res) => {
  try {
    const result = validatePackage(req.body || {});
    if (result.error) {
      return res.status(400).json({ success: false, message: result.error });
    }

    const pkg = await MasterPackage.create(result.value);

    res.status(201).json({
      success: true,
      message: "Package created successfully",
      package: pkg,
    });
  } catch (error) {
    res.status(error.code === 11000 ? 409 : 500).json({
      success: false,
      message: error.code === 11000
        ? "Package name already exists"
        : "Failed to create package",
    });
  }
});

// Update package
router.put("/:id", async (req, res) => {
  try {
    const result = validatePackage(req.body || {});
    if (result.error) {
      return res.status(400).json({ success: false, message: result.error });
    }

    const pkg = await MasterPackage.findByIdAndUpdate(
      req.params.id,
      result.value,
      { new: true, runValidators: true }
    );

    if (!pkg) {
      return res.status(404).json({ success: false, message: "Package not found" });
    }

    res.json({ success: true, package: pkg });
  } catch (error) {
    res.status(error.code === 11000 ? 409 : 500).json({
      success: false,
      message: "Unable to update package",
    });
  }
});

// Deactivate rather than delete assigned packages
router.patch("/:id/status", async (req, res) => {
  try {
    if (typeof req.body?.isActive !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isActive must be boolean",
      });
    }

    const pkg = await MasterPackage.findByIdAndUpdate(
      req.params.id,
      { isActive: req.body.isActive },
      { new: true }
    );

    if (!pkg) {
      return res.status(404).json({ success: false, message: "Package not found" });
    }

    res.json({ success: true, package: pkg });
  } catch (error) {
    res.status(500).json({ success: false, message: "Unable to change status" });
  }
});

module.exports = router;
