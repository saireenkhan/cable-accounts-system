const express = require('express');
const router = express.Router();
const {
  getPayments,
  createPayment,
  deletePayment,
} = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');

// ⚠️ Temporarily remove auth for testing
// router.use(protect);

router.route('/')
  .get(getPayments)
  .post(createPayment);

router.route('/:id')
  .delete(deletePayment);

module.exports = router;