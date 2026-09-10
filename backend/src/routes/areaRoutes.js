const express = require('express');
const router = express.Router();
const {
  getAreas,
  createArea,
  updateArea,
  deleteArea,
} = require('../controllers/areaController');
const { protect, authorize } = require('../middleware/auth');

// ⚠️ Temporarily remove auth for testing
// router.use(protect);

router.route('/')
  .get(getAreas)
  .post(createArea);  // ✅ No auth required for testing

router.route('/:id')
  .put(updateArea)
  .delete(deleteArea);

module.exports = router;