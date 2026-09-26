const express = require('express');
const router = express.Router();
const {
  getDealerAreas,
  createDealerArea,
  updateDealerArea,
  deleteDealerArea,
} = require('../controllers/dealerAreaController');  // ✅ Correct controller
const { protect, authorize } = require('../middleware/auth');

// ⚠️ Temporarily remove auth for testing
// router.use(protect);

router.route('/')
  .get(getDealerAreas)
  .post(createDealerArea);

router.route('/:id')
  .put(updateDealerArea)
  .delete(deleteDealerArea);

module.exports = router;