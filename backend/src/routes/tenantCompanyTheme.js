'use strict';

const express = require('express');
const { validateCompanyTheme } = require('../helpers/companyTheme');

/**
 * Tenant-only current theme. The resolver MUST obtain the company ID from
 * authenticated req.user/session; never read client-supplied IDs.
 * Mount at /api/tenant/theme with your real tenant middleware.
 */
function createTenantCompanyThemeRouter({ requireTenant, Company, resolveAuthenticatedCompanyId }) {
  if (typeof requireTenant !== 'function' || !Company || typeof resolveAuthenticatedCompanyId !== 'function') {
    throw new Error('Tenant auth, Company model, and authenticated company resolver are required');
  }
  const router = express.Router();
  router.get('/current', requireTenant, async (req, res) => {
    try {
      const companyId = await resolveAuthenticatedCompanyId(req);
      if (!companyId) return res.status(403).json({ success: false, message: 'Tenant company not found' });
      const company = await Company.findById(companyId).select('theme isActive').lean();
      if (!company || company.isActive === false) {
        return res.status(403).json({ success: false, message: 'Tenant company not active' });
      }
      let theme = 'original';
      try { theme = validateCompanyTheme(company.theme); } catch (_error) { /* legacy theme => original */ }
      res.json({ success: true, theme });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Unable to load company theme' });
    }
  });
  return router;
}

module.exports = createTenantCompanyThemeRouter;