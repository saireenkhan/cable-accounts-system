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

const {
  bulkUploadPartners,
  downloadPartnerSample,
} = require('../controllers/bulkUploadController');

const upload = require('../middleware/upload');
const { protect, authorize } = require('../middleware/auth');

// ============================================================
// CRITICAL ORDER — /bulk-upload and /dashboard MUST come
// before /:id, otherwise Express treats them as :id values
// ============================================================

router.get('/bulk-upload/sample', downloadPartnerSample);

router.post(
  '/bulk-upload',
  protect,
  authorize('admin', 'manager'),
  upload.single('file'),
  bulkUploadPartners
);

router.get('/dashboard/stats', protect, getPartnerDashboardStats);

router.get('/', protect, getPartners);

router.get('/:id', protect, getPartner);

router.post('/', protect, createPartner);

router.put('/:id', protect, authorize('admin', 'manager'), updatePartner);

// Delete partner — admin + manager (cascades to PartnerPayment)
router.delete('/:id', protect, authorize('admin', 'manager'), deletePartner);

module.exports = router;