const express = require('express');
const router = express.Router();
const {
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getDashboardStats,
} = require('../controllers/customerController');
const {
  bulkUpload,
  downloadSample,
} = require('../controllers/bulkUploadController');
const upload = require('../middleware/upload');
const { protect, authorize } = require('../middleware/auth');

// ⚠️ IMPORTANT: /bulk-upload routes MUST come before /:id routes
// Otherwise Express will match "bulk-upload" as an :id param

// ✅ Sample CSV download (public — no auth needed so users can grab the template)
router.get('/bulk-upload/sample', downloadSample);

// ✅ Bulk upload — protected, admin/manager only
router.post(
  '/bulk-upload',
  protect,
  authorize('admin', 'manager'),
  upload.single('file'),
  bulkUpload
);

// Dashboard stats
router.get('/dashboard/stats', protect, getDashboardStats);

// List all customers
router.get('/', protect, getCustomers);

// Get single customer
router.get('/:id', protect, getCustomer);

// Create single customer (public for testing — change to protect later)
router.post('/', createCustomer);

// Update customer
router.put('/:id', protect, authorize('admin', 'manager'), updateCustomer);

// Delete customer
router.delete('/:id', protect, authorize('admin'), deleteCustomer);

module.exports = router;