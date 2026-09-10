const Customer = require('../models/Customer');
const Bill = require('../models/Bill');
const Payment = require('../models/Payment');
const Purchase = require('../models/Purchase');
const Expense = require('../models/Expense');
const DealerPayment = require('../models/DealerPayment');
const logger = require('../utils/logger');

exports.getCustomerReport = async (req, res) => {
  try {
    const { area, status, fromDate, toDate } = req.query;
    const filter = {};
    
    if (area) filter.area = area;
    if (status) filter.status = status;
    if (fromDate && toDate) {
      filter.createdAt = {
        $gte: new Date(fromDate),
        $lte: new Date(toDate),
      };
    }

    const customers = await Customer.find(filter)
      .populate('area', 'name')
      .populate('package', 'name sellingPrice')
      .sort({ createdAt: -1 });

    const total = customers.length;
    const active = customers.filter(c => c.status === 'active').length;
    const inactive = customers.filter(c => c.status !== 'active').length;

    res.json({
      success: true,
      report: {
        total,
        active,
        inactive,
        customers,
      },
    });
  } catch (error) {
    logger.error(`Customer report error: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getCollectionReport = async (req, res) => {
  try {
    const { fromDate, toDate, area } = req.query;
    const filter = {};
    
    if (fromDate && toDate) {
      filter.paymentDate = {
        $gte: new Date(fromDate),
        $lte: new Date(toDate),
      };
    }

    const payments = await Payment.find(filter)
      .populate('customer', 'name code area')
      .populate('receivedBy', 'name')
      .sort({ paymentDate: -1 });

    const total = payments.reduce((sum, p) => sum + p.amount, 0);

    // Group by month
    const monthlyData = {};
    payments.forEach(p => {
      const month = p.paymentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
      if (!monthlyData[month]) monthlyData[month] = 0;
      monthlyData[month] += p.amount;
    });

    res.json({
      success: true,
      report: {
        total,
        count: payments.length,
        payments,
        monthlyData,
      },
    });
  } catch (error) {
    logger.error(`Collection report error: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getOutstandingReport = async (req, res) => {
  try {
    const customers = await Customer.find({ status: 'default' })
      .populate('area', 'name')
      .populate('package', 'name sellingPrice');

    const bills = await Bill.find({ status: { $ne: 'paid' } })
      .populate('customer', 'name code')
      .sort({ dueDate: 1 });

    const totalOutstanding = bills.reduce((sum, b) => sum + b.balance, 0);

    res.json({
      success: true,
      report: {
        totalCustomers: customers.length,
        totalOutstanding,
        customers,
        bills,
      },
    });
  } catch (error) {
    logger.error(`Outstanding report error: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getExpenseReport = async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;
    const filter = {};
    
    if (fromDate && toDate) {
      filter.date = {
        $gte: new Date(fromDate),
        $lte: new Date(toDate),
      };
    }

    const purchases = await Purchase.find(filter).sort({ purchaseDate: -1 });
    const expenses = await Expense.find(filter).sort({ date: -1 });

    const totalPurchases = purchases.reduce((sum, p) => sum + p.amount, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const total = totalPurchases + totalExpenses;

    res.json({
      success: true,
      report: {
        total,
        totalPurchases,
        totalExpenses,
        purchases,
        expenses,
      },
    });
  } catch (error) {
    logger.error(`Expense report error: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};