const express = require('express');
const router = express.Router();
const {
  getPackages,
  createPackage,
  updatePackage,
  deletePackage,
} = require('../controllers/packageController');
const { protect, authorize } = require('../middleware/auth');

// ⚠️ Temporarily remove auth for testing
// router.use(protect);

router.route('/')
  .get(getPackages)
  .post(createPackage);

router.route('/:id')
  .put(updatePackage)
  .delete(deletePackage);

module.exports = router;