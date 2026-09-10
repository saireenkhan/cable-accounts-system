const express = require('express');
const router = express.Router();
const {
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
} = require('../controllers/expenseController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(getExpenses)
  .post(authorize('admin', 'manager'), createExpense);

router.route('/:id')
  .put(authorize('admin', 'manager'), updateExpense)
  .delete(authorize('admin'), deleteExpense);

module.exports = router;