const express = require('express');
const router = express.Router();
const {
  getPurchases,
  createPurchase,
  updatePurchase,
  deletePurchase,
} = require('../controllers/purchaseController');
const { protect, authorize } = require('../middleware/auth');

// ⚠️ Temporarily remove auth for testing
// router.use(protect);

router.route('/')
  .get(getPurchases)
  .post(createPurchase);

router.route('/:id')
  .put(updatePurchase)
  .delete(deletePurchase);

module.exports = router;