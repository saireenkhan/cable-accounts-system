const express = require('express');
const router = express.Router();
const {
  getPartnerPayments,
  createPartnerPayment,
  deletePartnerPayment,
} = require('../controllers/partnerPaymentController');
const { protect } = require('../middleware/auth');

// ⚠️ Temporarily remove auth for testing
// router.use(protect);

router.route('/')
  .get(getPartnerPayments)
  .post(createPartnerPayment);

router.route('/:id')
  .delete(deletePartnerPayment);

module.exports = router;