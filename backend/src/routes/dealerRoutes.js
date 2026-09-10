const express = require('express');
const router = express.Router();
const {
  getDealers,
  createDealer,
  updateDealer,
  deleteDealer,
  getDealerStats,
} = require('../controllers/dealerController');
const { protect, authorize } = require('../middleware/auth');

// ⚠️ Temporarily remove auth for testing
// router.use(protect);

router.get('/stats', getDealerStats);
router.route('/')
  .get(getDealers)
  .post(createDealer);

router.route('/:id')
  .put(updateDealer)
  .delete(deleteDealer);

module.exports = router;