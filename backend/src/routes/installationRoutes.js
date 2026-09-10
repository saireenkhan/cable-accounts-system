const express = require('express');
const router = express.Router();
const {
  getInstallationCharges,
  createInstallationCharge,
  updateInstallationCharge,
  deleteInstallationCharge,
} = require('../controllers/installationController');
const { protect, authorize } = require('../middleware/auth');

// ⚠️ Temporarily remove auth for testing
// router.use(protect);

router.route('/')
  .get(getInstallationCharges)
  .post(createInstallationCharge);

router.route('/:id')
  .put(updateInstallationCharge)
  .delete(deleteInstallationCharge);

module.exports = router;