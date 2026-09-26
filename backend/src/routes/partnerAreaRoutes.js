const express = require('express');
const router = express.Router();
const {
  getPartnerAreas,
  getPartnerArea,
  createPartnerArea,
  updatePartnerArea,
  deletePartnerArea,
} = require('../controllers/partnerAreaController');
const { protect, authorize } = require('../middleware/auth');

// ⚠️ Temporarily remove auth for testing (same as your Area routes)
router.use(protect);

router.route('/').get(getPartnerAreas).post(createPartnerArea);

router
  .route('/:id')
  .get(getPartnerArea)
  .put(updatePartnerArea)
  .delete(deletePartnerArea);

module.exports = router;