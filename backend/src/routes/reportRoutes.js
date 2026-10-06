const express = require('express');
const router = express.Router();

const {
  getCustomerReport,
  getBalanceReport,
  getCollectionReport,
  getOutstandingReport,
  getAreaReport,
  getPackageReport,

  // NEW PAYMENT REPORTS
  getUserPaymentReport,
  getDealerPaymentReport,

  getExpenseReport,
  getProfitLossReport,
  getDashboardSummary,
} = require('../controllers/reportController');

const { protect } = require('../middleware/auth');

// Protect all report routes
router.use(protect);

// ==========================================
// EXISTING REPORT ROUTES
// ==========================================

router.get('/customers', getCustomerReport);

router.get('/balance', getBalanceReport);

router.get('/collection', getCollectionReport);

router.get('/outstanding', getOutstandingReport);

router.get('/areas', getAreaReport);

router.get('/packages', getPackageReport);

router.get('/expenses', getExpenseReport);

router.get('/profit-loss', getProfitLossReport);

router.get('/dashboard-summary', getDashboardSummary);


// ==========================================
// PAYMENT HISTORY REPORTS
// ==========================================

// User Payment History
router.get(
  '/user-payment/:customerId',
  getUserPaymentReport
);

// Dealer Payment History
router.get(
  '/dealer-payment/:dealerId',
  getDealerPaymentReport
);


// ==========================================
// EXPORT ROUTER
// ==========================================

module.exports = router;