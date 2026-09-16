const express = require('express');
const router = express.Router();
const {
  getPartners,
  getPartner,
  createPartner,
  updatePartner,
  deletePartner,
  getPartnerDashboardStats,
} = require('../controllers/partnerController');

// ✅ Import partner bulk upload from the shared controller
const {
  bulkUploadPartners,
  downloadPartnerSample,
} = require('../controllers/bulkUploadController');

const upload = require('../middleware/upload');
const { protect, authorize } = require('../middleware/auth');

// ⚠️ CRITICAL ORDER — /bulk-upload and /dashboard MUST come before /:id
// Otherwise Express treats "bulk-upload" and "dashboard" as :id values

// ✅ Partner sample CSV download (public)
router.get('/bulk-upload/sample', downloadPartnerSample);

// ✅ Partner bulk upload (protected, admin/manager)
router.post(
  '/bulk-upload',
  protect,
  authorize('admin', 'manager'),
  upload.single('file'),
  bulkUploadPartners
);

// Dashboard stats (must be BEFORE /:id)
router.get('/dashboard/stats', protect, getPartnerDashboardStats);

// List all partners
router.get('/', protect, getPartners);

// Get single partner (this MUST be last of the GETs)
router.get('/:id', protect, getPartner);

// Create single partner
router.post('/', createPartner);

// Update partner
router.put('/:id', protect, authorize('admin', 'manager'), updatePartner);

// Delete partner
router.delete('/:id', protect, authorize('admin'), deletePartner);

module.exports = router;