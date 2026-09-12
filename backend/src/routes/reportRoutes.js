const express = require('express');
const router = express.Router();
const {
  getCustomerReport,
  getBalanceReport,
  getCollectionReport,
  getOutstandingReport,
  getAreaReport,
  getPackageReport,
  getExpenseReport,
  getProfitLossReport,
  getDashboardSummary,
} = require('../controllers/reportController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/customers', getCustomerReport);
router.get('/balance', getBalanceReport);
router.get('/collection', getCollectionReport);
router.get('/outstanding', getOutstandingReport);
router.get('/areas', getAreaReport);
router.get('/packages', getPackageReport);
router.get('/expenses', getExpenseReport);
router.get('/profit-loss', getProfitLossReport);
router.get('/dashboard-summary', getDashboardSummary);

module.exports = router;