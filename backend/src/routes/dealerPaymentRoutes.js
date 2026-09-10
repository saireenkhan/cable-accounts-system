const express = require('express');
const router = express.Router();
const {
  getDealerPayments,
  createDealerPayment,
} = require('../controllers/dealerPaymentController');
const { protect, authorize } = require('../middleware/auth');

// ⚠️ Temporarily remove auth for testing
// router.use(protect);

router.route('/')
  .get(getDealerPayments)
  .post(createDealerPayment);

module.exports = router;