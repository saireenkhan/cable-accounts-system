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
const { protect, authorize } = require('../middleware/auth');

// ✅ Apply protect to all routes except create (for testing)
router.get('/dashboard/stats', protect, getDashboardStats);
router.get('/', protect, getCustomers);
router.get('/:id', protect, getCustomer);
router.post('/', createCustomer); // ✅ Allow public for testing
router.put('/:id', protect, authorize('admin', 'manager'), updateCustomer);
router.delete('/:id', protect, authorize('admin'), deleteCustomer);

module.exports = router;