const express = require('express');
const router = express.Router();
const {
  getPartners,
  getPartner,
  createPartner,
  updatePartner,
  deletePartner,
} = require('../controllers/partnerListController');
const { protect, authorize } = require('../middleware/auth');

// ⚠️ Temporarily remove auth for testing
router.use(protect);

router.route('/').get(getPartners).post(createPartner);

router
  .route('/:id')
  .get(getPartner)
  .put(updatePartner)
  .delete(deletePartner);

module.exports = router;