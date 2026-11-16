'use strict';

const express = require('express');
const mongoose = require('mongoose');
const { validateCompanyTheme } = require('../helpers/companyTheme');

/**
 * Master-only management of individual COMPANY themes, not MasterPackage themes.
 * Mount at /api/master/company-themes with your real Company model/requireMaster.
 */
function createMasterCompanyThemesRouter({ requireMaster, Company }) {
  if (typeof requireMaster !== 'function' || !Company) throw new Error('Master auth and Company model are required');
  const router = express.Router();
  router.use(requireMaster);
  router.get('/', async (_req, res) => {
    try {
      const companies = await Company.find({}, 'name ownerEmail theme isActive masterPackageId').sort({ name: 1 }).lean();
      res.json({ success: true, companies });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Unable to load company themes' });
    }
  });
  router.patch('/:id', async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid company ID' });
    }
    let theme;
    try { theme = validateCompanyTheme(req.body?.theme, { defaultWhenMissing: false }); }
    catch (err) { return res.status(400).json({ success: false, message: err.message }); }
    try {
      const company = await Company.findByIdAndUpdate(req.params.id, { $set: { theme } },
        { new: true, runValidators: true }).select('name ownerEmail theme');
      if (!company) return res.status(404).json({ success: false, message: 'Company not found' });
      res.json({ success: true, company });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Unable to update company theme' });
    }
  });
  return router;
}

module.exports = createMasterCompanyThemesRouter;