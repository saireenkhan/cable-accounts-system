const express = require('express');
const router = express.Router();
const {
  getBills,
  getBill,
  createBill,  // ✅ Add this
  generateMonthlyBills,
  updateBillStatus,
} = require('../controllers/billController');
const { protect, authorize } = require('../middleware/auth');

// ⚠️ Temporarily remove auth for testing
// router.use(protect);

router.post('/generate', generateMonthlyBills);
router.route('/')
  .get(getBills)
  .post(createBill);  // ✅ Add POST route

router.route('/:id')
  .get(getBill)
  .put(updateBillStatus);

module.exports = router;