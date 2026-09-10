const express = require('express');
const router = express.Router();
const {
  getStaff,
  createStaff,
  updateStaff,
  deleteStaff,
} = require('../controllers/staffController');
const { protect, authorize } = require('../middleware/auth');

// ⚠️ Temporarily remove auth for testing
// router.use(protect);

router.route('/')
  .get(getStaff)
  .post(createStaff);

router.route('/:id')
  .put(updateStaff)
  .delete(deleteStaff);

module.exports = router;