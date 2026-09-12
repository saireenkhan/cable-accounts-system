const Customer = require('../models/Customer');
const Payment = require('../models/Payment');
const Purchase = require('../models/Purchase');
const Expense = require('../models/Expense');
const Dealer = require('../models/Dealer');
const DealerPayment = require('../models/DealerPayment');
const Package = require('../models/Package');
const Area = require('../models/Area');
const logger = require('../utils/logger');

// ============================================================
// HELPERS
// ============================================================
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const buildMonthPaidMap = (payments) => {
  const map = {};
  payments.forEach((p) => {
    if (!p.month) return;
    if (!map[p.month]) map[p.month] = 0;
    map[p.month] += p.amount || 0;
  });
  return map;
};

// Commission rate string "10%" → 0.10
const parseCommissionRate = (rateStr) => {
  if (!rateStr) return 0;
  const n = parseFloat(String(rateStr).replace('%', ''));
  return isNaN(n) ? 0 : n / 100;
};

// ============================================================
// 1. CUSTOMER REPORT
// GET /api/reports/customers
// ============================================================
exports.getCustomerReport = async (req, res) => {
  try {
    const { area, status, fromDate, toDate } = req.query;
    const filter = {};

    if (area && area !== 'All Areas') {
      const areaDoc = await Area.findOne({ name: area });
      if (areaDoc) filter.area = areaDoc._id;
    }
    if (status && status !== 'All Status') filter.status = status;
    if (fromDate && toDate) {
      filter.createdAt = {
        $gte: new Date(fromDate),
        $lte: new Date(toDate),
      };
    }

    const customers = await Customer.find(filter)
      .populate('area', 'name')
      .sort({ createdAt: -1 });

    const total = customers.length;
    const active = customers.filter((c) => c.status === 'active').length;
    const inactive = customers.filter((c) => c.status !== 'active').length;

    res.json({
      success: true,
      report: { total, active, inactive, customers },
    });
  } catch (error) {
    logger.error(`Customer report error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ============================================================
// 2. BALANCE REPORT
// GET /api/reports/balance
// ============================================================
exports.getBalanceReport = async (req, res) => {
  try {
    const { area, status } = req.query;
    const filter = {};

    if (area && area !== 'All Areas') {
      const areaDoc = await Area.findOne({ name: area });
      if (areaDoc) filter.area = areaDoc._id;
    }
    if (status && status !== 'All Status') filter.status = status;

    const customers = await Customer.find(filter).populate('area', 'name');
    const payments = await Payment.find({ isNoPayment: false });

    const rows = customers.map((c) => {
      const monthlyFee = c.monthlyFee || 0;
      const custPayments = payments.filter(
        (p) => p.customer?.toString() === c._id.toString()
      );
      const monthPaidMap = buildMonthPaidMap(custPayments);
      const activeMonths = Object.keys(monthPaidMap);

      const totalPaid = activeMonths.reduce(
        (sum, m) => sum + monthPaidMap[m],
        0
      );
      const totalExpected = monthlyFee * activeMonths.length;
      const outstanding = Math.max(0, totalExpected - totalPaid);

      return {
        _id: c._id,
        customerId: c.customerId || c.code || 'N/A',
        name: c.name,
        area: c.area?.name || 'N/A',
        monthlyFee,
        activeMonths: activeMonths.length,
        totalExpected,
        totalPaid,
        outstanding,
      };
    });

    const totals = rows.reduce(
      (acc, r) => {
        acc.totalExpected += r.totalExpected;
        acc.totalPaid += r.totalPaid;
        acc.outstanding += r.outstanding;
        return acc;
      },
      { totalExpected: 0, totalPaid: 0, outstanding: 0 }
    );

    res.json({
      success: true,
      report: { rows, totals, count: rows.length },
    });
  } catch (error) {
    logger.error(`Balance report error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ============================================================
// 3. COLLECTION (RECEIVE PAYMENT) REPORT
// GET /api/reports/collection
// ============================================================
exports.getCollectionReport = async (req, res) => {
  try {
    const { fromDate, toDate, area } = req.query;
    const filter = { isNoPayment: false };

    if (fromDate && toDate) {
      filter.paymentDate = {
        $gte: new Date(fromDate),
        $lte: new Date(toDate),
      };
    }

    let payments = await Payment.find(filter)
      .populate({
        path: 'customer',
        select: 'name code area',
        populate: { path: 'area', select: 'name' },
      })
      .populate('receivedBy', 'name')
      .sort({ paymentDate: -1 });

    if (area && area !== 'All Areas') {
      payments = payments.filter((p) => p.customer?.area?.name === area);
    }

    const total = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

    const monthlyData = {};
    payments.forEach((p) => {
      if (!p.paymentDate) return;
      const d = new Date(p.paymentDate);
      const key = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
      if (!monthlyData[key]) monthlyData[key] = 0;
      monthlyData[key] += p.amount || 0;
    });

    res.json({
      success: true,
      report: { total, count: payments.length, payments, monthlyData },
    });
  } catch (error) {
    logger.error(`Collection report error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ============================================================
// 4. OUTSTANDING REPORT
// GET /api/reports/outstanding
// ============================================================
exports.getOutstandingReport = async (req, res) => {
  try {
    const { area } = req.query;
    const filter = {};
    if (area && area !== 'All Areas') {
      const areaDoc = await Area.findOne({ name: area });
      if (areaDoc) filter.area = areaDoc._id;
    }

    const customers = await Customer.find(filter).populate('area', 'name');
    const payments = await Payment.find({ isNoPayment: false });

    const rows = [];
    let totalOutstanding = 0;

    customers.forEach((c) => {
      const monthlyFee = c.monthlyFee || 0;
      if (monthlyFee === 0) return;

      const custPayments = payments.filter(
        (p) => p.customer?.toString() === c._id.toString()
      );
      const monthPaidMap = buildMonthPaidMap(custPayments);
      const activeMonths = Object.keys(monthPaidMap);

      let outstanding = 0;
      if (activeMonths.length === 0) {
        outstanding = monthlyFee;
      } else {
        activeMonths.forEach((m) => {
          const paid = monthPaidMap[m];
          outstanding += Math.max(0, monthlyFee - paid);
        });
      }

      if (outstanding > 0) {
        rows.push({
          _id: c._id,
          customerId: c.customerId || c.code || 'N/A',
          name: c.name,
          area: c.area?.name || 'N/A',
          monthlyFee,
          outstanding,
        });
        totalOutstanding += outstanding;
      }
    });

    res.json({
      success: true,
      report: {
        totalCustomers: rows.length,
        totalOutstanding,
        customers: rows,
      },
    });
  } catch (error) {
    logger.error(`Outstanding report error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ============================================================
// 5. AREA REPORT
// GET /api/reports/areas
// ============================================================
exports.getAreaReport = async (req, res) => {
  try {
    const customers = await Customer.find({}).populate('area', 'name');
    const payments = await Payment.find({ isNoPayment: false });

    const areaMap = {};

    customers.forEach((c) => {
      const areaName = c.area?.name || 'No Area';
      if (!areaMap[areaName]) {
        areaMap[areaName] = {
          area: areaName,
          customers: 0,
          totalBill: 0,
          recovered: 0,
          outstanding: 0,
        };
      }
      areaMap[areaName].customers += 1;
      areaMap[areaName].totalBill += c.monthlyFee || 0;
    });

    payments.forEach((p) => {
      const cust = customers.find(
        (c) => c._id.toString() === p.customer?.toString()
      );
      if (!cust) return;
      const areaName = cust.area?.name || 'No Area';
      if (!areaMap[areaName]) return;
      areaMap[areaName].recovered += p.amount || 0;
    });

    const rows = Object.values(areaMap).map((a) => {
      a.outstanding = Math.max(0, a.totalBill - a.recovered);
      a.recovery = a.totalBill > 0
        ? Math.round((a.recovered / a.totalBill) * 1000) / 10
        : 0;
      return a;
    });

    const totals = rows.reduce(
      (acc, a) => {
        acc.customers += a.customers;
        acc.totalBill += a.totalBill;
        acc.recovered += a.recovered;
        acc.outstanding += a.outstanding;
        return acc;
      },
      { customers: 0, totalBill: 0, recovered: 0, outstanding: 0 }
    );

    res.json({ success: true, report: { rows, totals } });
  } catch (error) {
    logger.error(`Area report error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ============================================================
// 6. PACKAGE REPORT
// GET /api/reports/packages
// ============================================================
exports.getPackageReport = async (req, res) => {
  try {
    const packages = await Package.find({});
    const customers = await Customer.find({});

    const rows = packages.map((pkg) => {
      const count = customers.filter((c) => c.package === pkg.name).length;
      const revenue = count * (pkg.sellingPrice || 0);
      const cost = count * (pkg.purchasePrice || 0);

      return {
        _id: pkg._id,
        name: pkg.name,
        bandwidth: pkg.bandwidth || 'N/A',
        sellingPrice: pkg.sellingPrice || 0,
        purchasePrice: pkg.purchasePrice || 0,
        profitPerUnit: (pkg.sellingPrice || 0) - (pkg.purchasePrice || 0),
        customerCount: count,
        totalRevenue: revenue,
        totalCost: cost,
        totalProfit: revenue - cost,
      };
    });

    const totals = rows.reduce(
      (acc, r) => {
        acc.customerCount += r.customerCount;
        acc.totalRevenue += r.totalRevenue;
        acc.totalCost += r.totalCost;
        acc.totalProfit += r.totalProfit;
        return acc;
      },
      { customerCount: 0, totalRevenue: 0, totalCost: 0, totalProfit: 0 }
    );

    res.json({ success: true, report: { rows, totals } });
  } catch (error) {
    logger.error(`Package report error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ============================================================
// 7. EXPENSE REPORT
// GET /api/reports/expenses
// ============================================================
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
    const purchaseFilter = {};
    if (fromDate && toDate) {
      purchaseFilter.purchaseDate = {
        $gte: new Date(fromDate),
        $lte: new Date(toDate),
      };
    }

    const purchases = await Purchase.find(purchaseFilter).sort({ purchaseDate: -1 });
    const expenses = await Expense.find(filter).sort({ date: -1 });

    const totalPurchases = purchases.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    const categoryBreakdown = {};
    expenses.forEach((e) => {
      const cat = e.category || 'other';
      if (!categoryBreakdown[cat]) categoryBreakdown[cat] = 0;
      categoryBreakdown[cat] += e.amount || 0;
    });

    res.json({
      success: true,
      report: {
        total: totalPurchases + totalExpenses,
        totalPurchases,
        totalExpenses,
        purchases,
        expenses,
        categoryBreakdown,
      },
    });
  } catch (error) {
    logger.error(`Expense report error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ============================================================
// 8. PROFIT & LOSS REPORT
// GET /api/reports/profit-loss
//
// Logic:
//   Package profit  = payment.amount × (package.profit / package.sellingPrice)
//   Commission profit = dealer_receive.amount × dealer.commission%
//   Costs = expenses + purchases
//   Net   = packageProfit + commissionProfit − costs
// ============================================================
exports.getProfitLossReport = async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;

    const dateFilter = {};
    if (fromDate && toDate) {
      dateFilter.$gte = new Date(fromDate);
      dateFilter.$lte = new Date(toDate);
    }

    const paymentFilter = { isNoPayment: false };
    if (fromDate && toDate) paymentFilter.paymentDate = dateFilter;

    const expenseFilter = {};
    if (fromDate && toDate) expenseFilter.date = dateFilter;

    const purchaseFilter = {};
    if (fromDate && toDate) purchaseFilter.purchaseDate = dateFilter;

    const dealerFilter = {};
    if (fromDate && toDate) dealerFilter.paymentDate = dateFilter;

    // ---------- Fetch ----------
    const payments = await Payment.find(paymentFilter).populate(
      'customer',
      'name package'
    );
    const packages = await Package.find({});
    const dealerReceive = await DealerPayment.find({
      ...dealerFilter,
      paymentType: 'receive_payment',
    }).populate('dealer', 'name commission');
    const expenses = await Expense.find(expenseFilter);
    const purchases = await Purchase.find(purchaseFilter);

    // ---------- Package lookup ----------
    const packageMap = {};
    packages.forEach((p) => {
      packageMap[p.name] = {
        sellingPrice: p.sellingPrice || 0,
        purchasePrice: p.purchasePrice || 0,
        profit: (p.sellingPrice || 0) - (p.purchasePrice || 0),
      };
    });

    // ---------- Package profit (per payment) ----------
    const paymentDetails = payments.map((p) => {
      const pkgName = p.customer?.package || '';
      const pkg = packageMap[pkgName];
      const revenue = p.amount || 0;
      let profit = 0;
      let cost = 0;

      if (pkg && pkg.sellingPrice > 0) {
        const profitRatio = pkg.profit / pkg.sellingPrice;
        const costRatio = pkg.purchasePrice / pkg.sellingPrice;
        profit = revenue * profitRatio;
        cost = revenue * costRatio;
      }

      return {
        receiptNo: p.receiptNo,
        customer: p.customer?.name || 'Unknown',
        package: pkgName || 'N/A',
        month: p.month,
        date: p.paymentDate,
        amount: revenue,
        profit: Math.round(profit),
        cost: Math.round(cost),
      };
    });

    const totalPackageProfit = paymentDetails.reduce(
      (s, p) => s + p.profit,
      0
    );
    const totalCustomerRevenue = paymentDetails.reduce(
      (s, p) => s + p.amount,
      0
    );
    const totalPackageCost = paymentDetails.reduce((s, p) => s + p.cost, 0);

    // ---------- Commission profit ----------
    const commissionDetails = dealerReceive.map((d) => {
      const rateStr = d.dealer?.commission || '0%';
      const rate = parseCommissionRate(rateStr);
      const commission = Math.round((d.amount || 0) * rate);

      return {
        receiptNo: d.receiptNo,
        dealer: d.dealer?.name || 'Unknown',
        rate: rateStr,
        date: d.paymentDate,
        amount: d.amount || 0,
        commission,
      };
    });

    const totalCommissionProfit = commissionDetails.reduce(
      (s, c) => s + c.commission,
      0
    );
    const totalDealerRevenue = commissionDetails.reduce(
      (s, c) => s + c.amount,
      0
    );

    // ---------- Costs ----------
    const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
    const totalPurchases = purchases.reduce((s, p) => s + (p.amount || 0), 0);
    const totalCosts = totalExpenses + totalPurchases;

    // ---------- Bottom line ----------
    const grossProfit = totalPackageProfit + totalCommissionProfit;
    const netProfit = grossProfit - totalCosts;

    // ---------- Monthly trend ----------
    const monthlyMap = {};
    const bumpMonth = (date, key, val) => {
      if (!date) return;
      const d = new Date(date);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyMap[monthKey]) {
        monthlyMap[monthKey] = {
          month: monthKey,
          packageProfit: 0,
          commissionProfit: 0,
          expenses: 0,
          purchases: 0,
          netProfit: 0,
        };
      }
      monthlyMap[monthKey][key] += val;
    };

    paymentDetails.forEach((p) => bumpMonth(p.date, 'packageProfit', p.profit));
    commissionDetails.forEach((c) =>
      bumpMonth(c.date, 'commissionProfit', c.commission)
    );
    expenses.forEach((e) => bumpMonth(e.date, 'expenses', e.amount || 0));
    purchases.forEach((p) =>
      bumpMonth(p.purchaseDate, 'purchases', p.amount || 0)
    );

    const monthlyBreakdown = Object.values(monthlyMap)
      .map((m) => ({
        ...m,
        netProfit:
          m.packageProfit +
          m.commissionProfit -
          m.expenses -
          m.purchases,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    res.json({
      success: true,
      report: {
        totalCustomerRevenue,
        totalDealerRevenue,
        totalRevenue: totalCustomerRevenue + totalDealerRevenue,

        totalPackageProfit,
        totalCommissionProfit,
        grossProfit,

        totalPackageCost,
        totalExpenses,
        totalPurchases,
        totalCosts,

        netProfit,
        isProfit: netProfit >= 0,

        paymentDetails,
        commissionDetails,
        monthlyBreakdown,

        meta: {
          paymentCount: payments.length,
          dealerPaymentCount: dealerReceive.length,
          expenseCount: expenses.length,
          purchaseCount: purchases.length,
        },
      },
    });
  } catch (error) {
    logger.error(`P&L report error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ============================================================
// DASHBOARD SUMMARY (for top 4 cards)
// GET /api/reports/dashboard-summary
// ============================================================
exports.getDashboardSummary = async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    );

    // Customer counts
    const totalCustomers = await Customer.countDocuments({});
    const activeCustomers = await Customer.countDocuments({ status: 'active' });

    // Payments this month
    const payments = await Payment.find({
      isNoPayment: false,
      paymentDate: { $gte: startOfMonth, $lte: endOfMonth },
    }).populate('customer', 'name package');

    const totalCollected = payments.reduce((s, p) => s + (p.amount || 0), 0);

    // Receivable this month (sum of monthlyFee)
    const customers = await Customer.find({});
    const monthlyReceivable = customers.reduce(
      (s, c) => s + (c.monthlyFee || 0),
      0
    );
    const recoveryRate =
      monthlyReceivable > 0
        ? Math.min(100, Math.round((totalCollected / monthlyReceivable) * 100))
        : 0;

    // Outstanding (all-time)
    const allPayments = await Payment.find({ isNoPayment: false });
    const customerPayMap = {};
    allPayments.forEach((p) => {
      const cid = p.customer?.toString();
      if (!cid) return;
      if (!customerPayMap[cid]) customerPayMap[cid] = {};
      if (!customerPayMap[cid][p.month]) customerPayMap[cid][p.month] = 0;
      customerPayMap[cid][p.month] += p.amount || 0;
    });

    let totalOutstanding = 0;
    let defaulterCount = 0;
    customers.forEach((c) => {
      const monthlyFee = c.monthlyFee || 0;
      if (monthlyFee === 0) return;
      const paid = customerPayMap[c._id.toString()] || {};
      const activeMonths = Object.keys(paid);

      let custOutstanding = 0;
      if (activeMonths.length === 0) {
        custOutstanding = monthlyFee;
      } else {
        activeMonths.forEach((m) => {
          custOutstanding += Math.max(0, monthlyFee - paid[m]);
        });
      }

      if (custOutstanding > 0) {
        totalOutstanding += custOutstanding;
        defaulterCount += 1;
      }
    });

    // Net profit this month (real P&L logic)
    const packages = await Package.find({});
    const packageMap = {};
    packages.forEach((p) => {
      packageMap[p.name] = {
        sellingPrice: p.sellingPrice || 0,
        profit: (p.sellingPrice || 0) - (p.purchasePrice || 0),
      };
    });

    let packageProfitMonth = 0;
    for (const p of payments) {
      const pkg = packageMap[p.customer?.package];
      if (pkg && pkg.sellingPrice > 0) {
        const ratio = pkg.profit / pkg.sellingPrice;
        packageProfitMonth += (p.amount || 0) * ratio;
      }
    }

    const monthDealerReceived = await DealerPayment.find({
      paymentType: 'receive_payment',
      paymentDate: { $gte: startOfMonth, $lte: endOfMonth },
    }).populate('dealer', 'commission');

    let commissionProfitMonth = 0;
    for (const d of monthDealerReceived) {
      const rate = parseCommissionRate(d.dealer?.commission);
      commissionProfitMonth += (d.amount || 0) * rate;
    }

    const monthExpenses = await Expense.find({
      date: { $gte: startOfMonth, $lte: endOfMonth },
    });
    const monthPurchases = await Purchase.find({
      purchaseDate: { $gte: startOfMonth, $lte: endOfMonth },
    });

    const monthExpenseTotal = monthExpenses.reduce(
      (s, e) => s + (e.amount || 0),
      0
    );
    const monthPurchaseTotal = monthPurchases.reduce(
      (s, p) => s + (p.amount || 0),
      0
    );

    const netProfit = Math.round(
      packageProfitMonth +
        commissionProfitMonth -
        monthExpenseTotal -
        monthPurchaseTotal
    );

    res.json({
      success: true,
      summary: {
        totalCustomers,
        activeCustomers,
        inactiveCustomers: totalCustomers - activeCustomers,
        totalCollected,
        monthlyReceivable,
        recoveryRate,
        totalOutstanding,
        defaulterCount,
        netProfit,
        isProfit: netProfit >= 0,
        monthLabel: `${MONTHS[now.getMonth()]} ${now.getFullYear()}`,
      },
    });
  } catch (error) {
    logger.error(`Dashboard summary error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};