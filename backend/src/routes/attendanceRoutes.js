const express = require('express');
const router = express.Router();
const {
  getAttendance,
  markAttendance,
  updateAttendance,
  deleteAttendance,
  getMonthlyReport,
} = require('../controllers/attendanceController');
const { protect, authorize } = require('../middleware/auth');


// router.use(protect);

// ============================================================
// ✅ Monthly report MUST come BEFORE any /:id route
// Otherwise Express treats "monthly" as an :id param.
// ============================================================
router.get('/monthly', getMonthlyReport);

router.route('/')
  .get(getAttendance)
  .post(markAttendance);

router.route('/:id')
  .put(updateAttendance)
  .delete(deleteAttendance);

module.exports = router;