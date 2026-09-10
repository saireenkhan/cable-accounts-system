const express = require('express');
const router = express.Router();
const {
  getCustomerReport,
  getCollectionReport,
  getOutstandingReport,
  getExpenseReport,
} = require('../controllers/reportController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/customers', getCustomerReport);
router.get('/collection', getCollectionReport);
router.get('/outstanding', getOutstandingReport);
router.get('/expenses', getExpenseReport);

module.exports = router;