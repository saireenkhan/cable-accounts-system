const Expense = require('../models/Expense');
const logger = require('../utils/logger');

const generateExpenseNo = async () => {
  const count = await Expense.countDocuments();
  return `EXP-${String(count + 1).padStart(3, '0')}`;
};

exports.getExpenses = async (req, res) => {
  try {
    const { category, fromDate, toDate } = req.query;
    const filter = {};
    
    if (category) filter.category = category;
    if (fromDate && toDate) {
      filter.date = {
        $gte: new Date(fromDate),
        $lte: new Date(toDate),
      };
    }

    const expenses = await Expense.find(filter)
      .populate('paidBy', 'name')
      .sort({ date: -1 });

    res.json({ success: true, expenses });
  } catch (error) {
    logger.error(`Get expenses error: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createExpense = async (req, res) => {
  try {
    const expenseNo = await generateExpenseNo();
    const expense = await Expense.create({
      expenseNo,
      ...req.body,
      paidBy: req.user.id,
    });

    res.status(201).json({
      success: true,
      expense,
      message: 'Expense added successfully',
    });
  } catch (error) {
    logger.error(`Create expense error: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateExpense = async (req, res) => {
  try {
    const expense = await Expense.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }
    
    res.json({ success: true, expense });
  } catch (error) {
    logger.error(`Update expense error: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findByIdAndDelete(req.params.id);
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }
    res.json({ success: true, message: 'Expense deleted successfully' });
  } catch (error) {
    logger.error(`Delete expense error: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};