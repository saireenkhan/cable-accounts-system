const Customer = require('../models/Customer');
const Payment = require('../models/Payment');
const Purchase = require('../models/Purchase');
const Expense = require('../models/Expense');
const Dealer = require('../models/Dealer');
const DealerPayment = require('../models/DealerPayment');
const Package = require('../models/Package');
const Area = require('../models/Area');
const Staff = require('../models/Staff');
const logger = require('../utils/logger');

// ============================================================
// HELPERS
// ============================================================

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const buildMonthPaidMap = (payments) => {
  const map = {};

  payments.forEach((p) => {
    if (!p.month) return;

    if (!map[p.month]) {
      map[p.month] = 0;
    }

    map[p.month] += p.amount || 0;
  });

  return map;
};

const parseCommissionRate = (rateStr) => {
  if (!rateStr) return 0;

  const n = parseFloat(String(rateStr).replace('%', ''));

  return isNaN(n) ? 0 : n / 100;
};

// Build area ID -> area name lookup
const buildAreaLookup = async () => {
  const areas = await Area.find({}).select('_id name').lean();

  const map = {};

  areas.forEach((a) => {
    map[String(a._id)] = a.name;
  });

  return map;
};

// ============================================================
// STAFF SALARY HELPER
// ============================================================

const getSalaryCost = async (fromDate, toDate) => {
  const staff = await Staff.find({ isActive: true }).populate(
    'assignedArea',
    'name'
  );

  const totalMonthlySalary = staff.reduce(
    (sum, st) => sum + (st.salary || 0),
    0
  );

  let monthsInRange = 1;

  if (fromDate && toDate) {
    const from = new Date(fromDate);
    const to = new Date(toDate);

    monthsInRange =
      (to.getFullYear() - from.getFullYear()) * 12 +
      (to.getMonth() - from.getMonth()) +
      1;

    if (monthsInRange < 1) {
      monthsInRange = 1;
    }
  }

  const totalSalaries = totalMonthlySalary * monthsInRange;

  return {
    totalSalaries,
    staffCount: staff.length,
    monthlySalary: totalMonthlySalary,
    monthsInRange,

    breakdown: staff.map((s) => ({
      staffId: s.staffId,
      name: s.name,
      designation: s.designation,
      area: s.assignedArea?.name || '—',
      monthlySalary: s.salary || 0,
      total: (s.salary || 0) * monthsInRange,
    })),
  };
};

// ============================================================
// 1. CUSTOMER REPORT
// ============================================================

exports.getCustomerReport = async (req, res) => {
  try {
    const { area, status, fromDate, toDate } = req.query;

    const filter = {};

    if (area && area !== 'All Areas') {
      filter.area = area;
    }

    if (status && status !== 'All Status') {
      filter.status = status;
    }

    if (fromDate && toDate) {
      filter.createdAt = {
        $gte: new Date(fromDate),
        $lte: new Date(toDate),
      };
    }

    const customers = await Customer.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    const total = customers.length;

    const active = customers.filter(
      (c) => c.status === 'active'
    ).length;

    const inactive = customers.filter(
      (c) => c.status !== 'active'
    ).length;

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

    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// ============================================================
// 2. BALANCE REPORT
// ============================================================

exports.getBalanceReport = async (req, res) => {
  try {
    const { area, status } = req.query;

    const filter = {};

    const areaLookup = await buildAreaLookup();

    if (area && area !== 'All Areas') {
      const areaDoc = await Area.findOne({
        name: area,
      })
        .select('_id')
        .lean();

      if (areaDoc) {
        filter.$or = [
          { area: area },
          { area: String(areaDoc._id) },
        ];
      } else {
        filter.area = area;
      }
    }

    if (status && status !== 'All Status') {
      filter.status = status;
    }

    const customers = await Customer.find(filter).lean();

    const payments = await Payment.find({
      isNoPayment: false,
    });

    const resolveAreaName = (raw) => {
      if (!raw) return 'N/A';

      const s = String(raw);

      return areaLookup[s] || s;
    };

    const rows = customers.map((c) => {
      const monthlyFee = c.monthlyFee || 0;

      const custPayments = payments.filter(
        (p) =>
          p.customer?.toString() ===
          c._id.toString()
      );

      const monthPaidMap =
        buildMonthPaidMap(custPayments);

      const activeMonths =
        Object.keys(monthPaidMap);

      const totalPaid = activeMonths.reduce(
        (sum, month) =>
          sum + monthPaidMap[month],
        0
      );

      const totalExpected =
        monthlyFee * activeMonths.length;

      const outstanding = Math.max(
        0,
        totalExpected - totalPaid
      );

      return {
        _id: c._id,

        customerId:
          c.customerId ||
          c.code ||
          'N/A',

        name: c.name,

        area: resolveAreaName(c.area),

        monthlyFee,

        activeMonths:
          activeMonths.length,

        totalExpected,

        totalPaid,

        outstanding,
      };
    });

    const totals = rows.reduce(
      (acc, row) => {
        acc.totalExpected +=
          row.totalExpected;

        acc.totalPaid +=
          row.totalPaid;

        acc.outstanding +=
          row.outstanding;

        return acc;
      },

      {
        totalExpected: 0,
        totalPaid: 0,
        outstanding: 0,
      }
    );

    res.json({
      success: true,

      report: {
        rows,
        totals,
        count: rows.length,
      },
    });
  } catch (error) {
    logger.error(
      `Balance report error: ${error.message}`
    );

    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// ============================================================
// 3. COLLECTION REPORT
// ============================================================

exports.getCollectionReport = async (req, res) => {
  try {
    const {
      fromDate,
      toDate,
      area,
    } = req.query;

    const filter = {
      isNoPayment: false,
    };

    const areaLookup =
      await buildAreaLookup();

    if (fromDate && toDate) {
      const from = new Date(fromDate);
      from.setHours(0, 0, 0, 0);

      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);

      filter.paymentDate = {
        $gte: from,
        $lte: to,
      };
    }

    let payments = await Payment.find(filter)
      .populate({
        path: 'customer',
        select:
          'name code customerId area',
      })
      .populate(
        'receivedBy',
        'name'
      )
      .sort({
        paymentDate: -1,
      });

    const resolveAreaName = (raw) => {
      if (!raw) return 'N/A';

      const s = String(raw);

      return areaLookup[s] || s;
    };

    if (
      area &&
      area !== 'All Areas'
    ) {
      payments = payments.filter(
        (p) => {
          const rawArea =
            p.customer?.area;

          if (!rawArea) {
            return false;
          }

          return (
            rawArea === area ||
            resolveAreaName(
              rawArea
            ) === area
          );
        }
      );
    }

    const total =
      payments.reduce(
        (sum, p) =>
          sum + (p.amount || 0),
        0
      );

    const monthlyData = {};

    payments.forEach((p) => {
      if (!p.paymentDate) return;

      const d = new Date(
        p.paymentDate
      );

      const key = `${
        MONTHS[d.getMonth()]
      } ${d.getFullYear()}`;

      if (!monthlyData[key]) {
        monthlyData[key] = 0;
      }

      monthlyData[key] +=
        p.amount || 0;
    });

    const paymentsForClient =
      payments.map((p) => ({
        ...p.toObject(),

        customer: p.customer
          ? {
              ...p.customer.toObject(),

              area:
                resolveAreaName(
                  p.customer.area
                ),
            }
          : null,
      }));

    res.json({
      success: true,

      report: {
        total,

        count:
          payments.length,

        payments:
          paymentsForClient,

        monthlyData,
      },
    });
  } catch (error) {
    logger.error(
      `Collection report error: ${error.message}`
    );

    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// ============================================================
// 4. OUTSTANDING REPORT
// ============================================================

exports.getOutstandingReport = async (req, res) => {
  try {
    const { area } = req.query;

    const filter = {};

    const areaLookup =
      await buildAreaLookup();

    if (
      area &&
      area !== 'All Areas'
    ) {
      const areaDoc =
        await Area.findOne({
          name: area,
        })
          .select('_id')
          .lean();

      if (areaDoc) {
        filter.$or = [
          { area },
          {
            area: String(
              areaDoc._id
            ),
          },
        ];
      } else {
        filter.area = area;
      }
    }

    const customers =
      await Customer.find(
        filter
      ).lean();

    const payments =
      await Payment.find({
        isNoPayment: false,
      });

    const resolveAreaName = (
      raw
    ) => {
      if (!raw) return 'N/A';

      const s = String(raw);

      return (
        areaLookup[s] || s
      );
    };

    const rows = [];

    let totalOutstanding = 0;

    customers.forEach((c) => {
      const monthlyFee =
        c.monthlyFee || 0;

      if (monthlyFee === 0) {
        return;
      }

      const custPayments =
        payments.filter(
          (p) =>
            p.customer?.toString() ===
            c._id.toString()
        );

      const monthPaidMap =
        buildMonthPaidMap(
          custPayments
        );

      const activeMonths =
        Object.keys(
          monthPaidMap
        );

      let outstanding = 0;

      if (
        activeMonths.length === 0
      ) {
        outstanding =
          monthlyFee;
      } else {
        activeMonths.forEach(
          (month) => {
            const paid =
              monthPaidMap[
                month
              ];

            outstanding +=
              Math.max(
                0,
                monthlyFee -
                  paid
              );
          }
        );
      }

      if (outstanding > 0) {
        rows.push({
          _id: c._id,

          customerId:
            c.customerId ||
            c.code ||
            'N/A',

          name: c.name,

          area:
            resolveAreaName(
              c.area
            ),

          monthlyFee,

          outstanding,
        });

        totalOutstanding +=
          outstanding;
      }
    });

    res.json({
      success: true,

      report: {
        totalCustomers:
          rows.length,

        totalOutstanding,

        customers: rows,
      },
    });
  } catch (error) {
    logger.error(
      `Outstanding report error: ${error.message}`
    );

    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// ============================================================
// 5. AREA REPORT
// ============================================================

exports.getAreaReport = async (req, res) => {
  try {
    const customers =
      await Customer.find(
        {}
      ).lean();

    const payments =
      await Payment.find({
        isNoPayment: false,
      });

    const areaLookup =
      await buildAreaLookup();

    const resolveAreaName = (
      raw
    ) => {
      if (!raw) {
        return 'No Area';
      }

      const s = String(raw);

      return (
        areaLookup[s] ||
        s ||
        'No Area'
      );
    };

    const areaMap = {};

    customers.forEach((c) => {
      const areaName =
        resolveAreaName(
          c.area
        );

      if (
        !areaMap[areaName]
      ) {
        areaMap[areaName] = {
          area: areaName,
          customers: 0,
          totalBill: 0,
          recovered: 0,
          outstanding: 0,
        };
      }

      areaMap[
        areaName
      ].customers += 1;

      areaMap[
        areaName
      ].totalBill +=
        c.monthlyFee || 0;
    });

    payments.forEach((p) => {
      const cust =
        customers.find(
          (c) =>
            c._id.toString() ===
            p.customer?.toString()
        );

      if (!cust) return;

      const areaName =
        resolveAreaName(
          cust.area
        );

      if (
        !areaMap[areaName]
      ) {
        return;
      }

      areaMap[
        areaName
      ].recovered +=
        p.amount || 0;
    });

    const rows =
      Object.values(
        areaMap
      ).map((a) => {
        a.outstanding =
          Math.max(
            0,
            a.totalBill -
              a.recovered
          );

        a.recovery =
          a.totalBill > 0
            ? Math.round(
                (a.recovered /
                  a.totalBill) *
                  1000
              ) / 10
            : 0;

        return a;
      });

    const totals =
      rows.reduce(
        (acc, a) => {
          acc.customers +=
            a.customers;

          acc.totalBill +=
            a.totalBill;

          acc.recovered +=
            a.recovered;

          acc.outstanding +=
            a.outstanding;

          return acc;
        },

        {
          customers: 0,
          totalBill: 0,
          recovered: 0,
          outstanding: 0,
        }
      );

    res.json({
      success: true,

      report: {
        rows,
        totals,
      },
    });
  } catch (error) {
    logger.error(
      `Area report error: ${error.message}`
    );

    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// ============================================================
// 6. PACKAGE REPORT
// ============================================================

exports.getPackageReport = async (req, res) => {
  try {
    const packages =
      await Package.find({});

    const customers =
      await Customer.find({});

    const rows =
      packages.map((pkg) => {
        const count =
          customers.filter(
            (c) =>
              c.package ===
              pkg.name
          ).length;

        const revenue =
          count *
          (pkg.sellingPrice ||
            0);

        const cost =
          count *
          (pkg.purchasePrice ||
            0);

        return {
          _id: pkg._id,

          name: pkg.name,

          bandwidth:
            pkg.bandwidth ||
            'N/A',

          sellingPrice:
            pkg.sellingPrice ||
            0,

          purchasePrice:
            pkg.purchasePrice ||
            0,

          profitPerUnit:
            (pkg.sellingPrice ||
              0) -
            (pkg.purchasePrice ||
              0),

          customerCount:
            count,

          totalRevenue:
            revenue,

          totalCost: cost,

          totalProfit:
            revenue - cost,
        };
      });

    const totals =
      rows.reduce(
        (acc, row) => {
          acc.customerCount +=
            row.customerCount;

          acc.totalRevenue +=
            row.totalRevenue;

          acc.totalCost +=
            row.totalCost;

          acc.totalProfit +=
            row.totalProfit;

          return acc;
        },

        {
          customerCount: 0,
          totalRevenue: 0,
          totalCost: 0,
          totalProfit: 0,
        }
      );

    res.json({
      success: true,

      report: {
        rows,
        totals,
      },
    });
  } catch (error) {
    logger.error(
      `Package report error: ${error.message}`
    );

    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// ============================================================
// 7. USER PAYMENT REPORT
// GET /api/reports/user-payment/:customerId
// ============================================================

exports.getUserPaymentReport = async (req, res) => {
  try {
    const mongoose =
      require('mongoose');

    const { customerId } =
      req.params;

    const {
      fromDate,
      toDate,
    } = req.query;

    if (
      !mongoose.Types.ObjectId.isValid(
        customerId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid customer ID',
      });
    }

    const customer =
      await Customer.findById(
        customerId
      ).lean();

    if (!customer) {
      return res.status(404).json({
        success: false,
        message:
          'Customer not found',
      });
    }

    // ---------------------------
    // Resolve area
    // ---------------------------

    let areaName = 'N/A';

    if (customer.area) {
      if (
        typeof customer.area ===
          'object' &&
        customer.area.name
      ) {
        areaName =
          customer.area.name;
      } else {
        const raw = String(
          customer.area
        ).trim();

        if (
          mongoose.Types.ObjectId.isValid(
            raw
          )
        ) {
          const areaDoc =
            await Area.findById(
              raw
            )
              .select('name')
              .lean();

          areaName =
            areaDoc?.name ||
            raw;
        } else {
          areaName =
            raw || 'N/A';
        }
      }
    }

    // ---------------------------
    // Payment filter
    // ---------------------------

    const paymentFilter = {
      customer:
        customer._id,

      isNoPayment: false,
    };

    if (
      fromDate ||
      toDate
    ) {
      const range = {};

      if (fromDate) {
        const from =
          new Date(
            fromDate
          );

        from.setHours(
          0,
          0,
          0,
          0
        );

        range.$gte = from;
      }

      if (toDate) {
        const to =
          new Date(
            toDate
          );

        to.setHours(
          23,
          59,
          59,
          999
        );

        range.$lte = to;
      }

      paymentFilter.$or = [
        {
          paymentDate:
            range,
        },

        {
          paymentDate: {
            $exists: false,
          },

          createdAt:
            range,
        },

        {
          paymentDate:
            null,

          createdAt:
            range,
        },
      ];
    }

    let payments = [];

    try {
      payments =
        await Payment.find(
          paymentFilter
        )
          .populate(
            'receivedBy',
            'name'
          )
          .sort({
            paymentDate: -1,
          });
    } catch (e) {
      payments =
        await Payment.find(
          paymentFilter
        )
          .populate(
            'receivedBy',
            'name'
          )
          .sort({
            createdAt: -1,
          });
    }

    const monthlyFee =
      customer.monthlyFee ||
      0;

    const totalPaid =
      payments.reduce(
        (sum, p) =>
          sum +
          (p.amount || 0),
        0
      );

    const monthsPaid =
      new Set(
        payments
          .map(
            (p) => p.month
          )
          .filter(Boolean)
      ).size;

    const totalExpected =
      monthlyFee *
      monthsPaid;

    const outstanding =
      Math.max(
        0,
        totalExpected -
          totalPaid
      );

    const byMonth = {};

    payments.forEach((p) => {
      const month =
        p.month ||
        'Unknown';

      if (!byMonth[month]) {
        byMonth[month] = 0;
      }

      byMonth[month] +=
        p.amount || 0;
    });

    return res.json({
      success: true,

      report: {
        customer: {
          _id:
            customer._id,

          customerId:
            customer.customerId ||
            customer.code ||
            'N/A',

          name:
            customer.name ||
            'N/A',

          phone:
            customer.phone ||
            '',

          cnic:
            customer.cnic ||
            '',

          address:
            customer.address ||
            '',

          area:
            areaName,

          package:
            customer.package ||
            'N/A',

          monthlyFee,

          status:
            customer.status ||
            'unknown',

          joiningDate:
            customer.createdAt,

          dealer: 'N/A',

          technician: 'N/A',
        },

        summary: {
          monthlyFee,

          totalPaid,

          totalExpected,

          outstanding,

          monthsPaid,

          paymentCount:
            payments.length,
        },

        payments:
          payments.map(
            (p) => ({
              _id: p._id,

              receiptNo:
                p.receiptNo ||
                '—',

              amount:
                p.amount ||
                0,

              month:
                p.month ||
                '—',

              paymentDate:
                p.paymentDate ||
                p.createdAt,

              method:
                p.paymentMethod ||
                'Cash',

              receivedBy:
                p.receivedBy
                  ?.name ||
                '—',

              remarks:
                p.remarks ||
                '',
            })
          ),

        byMonth,

        dateRange: {
          from:
            fromDate ||
            null,

          to:
            toDate ||
            null,
        },
      },
    });
  } catch (error) {
    console.error(
      'getUserPaymentReport ERROR:',
      error
    );

    logger.error(
      `User payment report error: ${error.message}`
    );

    return res.status(500).json({
      success: false,

      message:
        error.message ||
        'Failed to generate user payment report',
    });
  }
};

// ============================================================
// 8. DEALER PAYMENT REPORT
// GET /api/reports/dealer-payment/:dealerId
// ============================================================

exports.getDealerPaymentReport = async (req, res) => {
  try {
    const mongoose =
      require('mongoose');

    const { dealerId } =
      req.params;

    const {
      fromDate,
      toDate,
    } = req.query;

    if (
      !mongoose.Types.ObjectId.isValid(
        dealerId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid dealer ID',
      });
    }

    const dealer =
      await Dealer.findById(
        dealerId
      )
        .populate(
          'area',
          'name'
        )
        .lean();

    if (!dealer) {
      return res.status(404).json({
        success: false,
        message:
          'Dealer not found',
      });
    }

    const paymentFilter = {
      dealer:
        dealer._id,
    };

    if (
      fromDate ||
      toDate
    ) {
      const range = {};

      if (fromDate) {
        const from =
          new Date(
            fromDate
          );

        from.setHours(
          0,
          0,
          0,
          0
        );

        range.$gte = from;
      }

      if (toDate) {
        const to =
          new Date(
            toDate
          );

        to.setHours(
          23,
          59,
          59,
          999
        );

        range.$lte = to;
      }

      paymentFilter.paymentDate =
        range;
    }

    const payments =
      await DealerPayment.find(
        paymentFilter
      )
        .populate(
          'receivedBy',
          'name'
        )
        .sort({
          paymentDate: -1,
          createdAt: -1,
        })
        .lean();

    const receivePayments =
      payments.filter(
        (p) =>
          p.paymentType ===
          'receive_payment'
      );

    const addPayments =
      payments.filter(
        (p) =>
          p.paymentType ===
          'add_payment'
      );

    const totalReceived =
      receivePayments.reduce(
        (sum, p) =>
          sum +
          Number(
            p.amount || 0
          ),
        0
      );

    const totalAdded =
      addPayments.reduce(
        (sum, p) =>
          sum +
          Number(
            p.amount || 0
          ),
        0
      );

    const totalCommission =
      payments.reduce(
        (sum, p) =>
          sum +
          Number(
            p.commission ||
              0
          ),
        0
      );

    const byMonth = {};

    payments.forEach((p) => {
      const month =
        p.month ||
        'Unknown';

      if (!byMonth[month]) {
        byMonth[month] = {
          received: 0,
          added: 0,
          commission: 0,
          count: 0,
        };
      }

      if (
        p.paymentType ===
        'receive_payment'
      ) {
        byMonth[
          month
        ].received +=
          Number(
            p.amount || 0
          );
      } else {
        byMonth[
          month
        ].added +=
          Number(
            p.amount || 0
          );
      }

      byMonth[
        month
      ].commission +=
        Number(
          p.commission ||
            0
        );

      byMonth[
        month
      ].count += 1;
    });

    return res.json({
      success: true,

      report: {
        dealer: {
          _id:
            dealer._id,

          dealerId:
            dealer.dealerId ||
            'N/A',

          name:
            dealer.name ||
            'N/A',

          cellNo:
            dealer.cellNo ||
            '',

          isp:
            dealer.isp ||
            '',

          area:
            dealer.area
              ?.name ||
            'N/A',

          address:
            dealer.address ||
            '',

          remarks:
            dealer.remarks ||
            '',

          openingBalance:
            Number(
              dealer.openingBalance ||
                0
            ),

          currentBalance:
            Number(
              dealer.currentBalance ||
                0
            ),

          commission:
            dealer.commission ||
            '0%',

          status:
            dealer.status ||
            'inactive',

          createdAt:
            dealer.createdAt,
        },

        summary: {
          openingBalance:
            Number(
              dealer.openingBalance ||
                0
            ),

          currentBalance:
            Number(
              dealer.currentBalance ||
                0
            ),

          totalReceived,

          totalAdded,

          totalCommission,

          paymentCount:
            payments.length,

          receivedCount:
            receivePayments.length,

          addedCount:
            addPayments.length,
        },

        payments:
          payments.map(
            (p) => ({
              _id: p._id,

              receiptNo:
                p.receiptNo ||
                '—',

              amount:
                Number(
                  p.amount ||
                    0
                ),

              month:
                p.month ||
                '—',

              paymentDate:
                p.paymentDate ||
                p.createdAt,

              paymentMethod:
                p.paymentMethod ||
                'cash',

              paymentType:
                p.paymentType ||
                'receive_payment',

              paymentFor:
                p.paymentFor ||
                '',

              commission:
                Number(
                  p.commission ||
                    0
                ),

              commissionRate:
                p.commissionRate ||
                '',

              paidBy:
                p.paidBy ||
                '',

              collectedBy:
                p.collectedBy ||
                '',

              receivedBy:
                p.receivedBy
                  ?.name ||
                '—',

              remarks:
                p.remarks ||
                '',
            })
          ),

        byMonth,

        dateRange: {
          from:
            fromDate ||
            null,

          to:
            toDate ||
            null,
        },
      },
    });
  } catch (error) {
    console.error(
      'getDealerPaymentReport ERROR:',
      error
    );

    logger.error(
      `Dealer payment report error: ${error.message}`
    );

    return res.status(500).json({
      success: false,

      message:
        error.message ||
        'Failed to generate dealer payment report',
    });
  }
};

// ============================================================
// 9. EXPENSE REPORT
// ============================================================

exports.getExpenseReport = async (req, res) => {
  try {
    const {
      fromDate,
      toDate,
    } = req.query;

    const filter = {};

    if (
      fromDate &&
      toDate
    ) {
      const from =
        new Date(
          fromDate
        );

      from.setHours(
        0,
        0,
        0,
        0
      );

      const to =
        new Date(
          toDate
        );

      to.setHours(
        23,
        59,
        59,
        999
      );

      filter.date = {
        $gte: from,
        $lte: to,
      };
    }

    const purchaseFilter =
      {};

    if (
      fromDate &&
      toDate
    ) {
      const from =
        new Date(
          fromDate
        );

      from.setHours(
        0,
        0,
        0,
        0
      );

      const to =
        new Date(
          toDate
        );

      to.setHours(
        23,
        59,
        59,
        999
      );

      purchaseFilter.purchaseDate =
        {
          $gte: from,
          $lte: to,
        };
    }

    const purchases =
      await Purchase.find(
        purchaseFilter
      ).sort({
        purchaseDate: -1,
      });

    const expenses =
      await Expense.find(
        filter
      ).sort({
        date: -1,
      });

    const totalPurchases =
      purchases.reduce(
        (sum, p) =>
          sum +
          (p.amount || 0),
        0
      );

    const totalExpenses =
      expenses.reduce(
        (sum, e) =>
          sum +
          (e.amount || 0),
        0
      );

    const categoryBreakdown =
      {};

    expenses.forEach((e) => {
      const category =
        e.category ||
        'other';

      if (
        !categoryBreakdown[
          category
        ]
      ) {
        categoryBreakdown[
          category
        ] = 0;
      }

      categoryBreakdown[
        category
      ] += e.amount || 0;
    });

    res.json({
      success: true,

      report: {
        total:
          totalPurchases +
          totalExpenses,

        totalPurchases,

        totalExpenses,

        purchases,

        expenses,

        categoryBreakdown,
      },
    });
  } catch (error) {
    logger.error(
      `Expense report error: ${error.message}`
    );

    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// ============================================================
// 10. PROFIT & LOSS REPORT
// KEEPING YOUR EXISTING PROFIT/LOSS LOGIC
// ============================================================

exports.getProfitLossReport = async (req, res) => {
  try {
    const {
      fromDate,
      toDate,
    } = req.query;

    const dateFilter = {};

    if (
      fromDate &&
      toDate
    ) {
      const from =
        new Date(
          fromDate
        );

      from.setHours(
        0,
        0,
        0,
        0
      );

      const to =
        new Date(
          toDate
        );

      to.setHours(
        23,
        59,
        59,
        999
      );

      dateFilter.$gte =
        from;

      dateFilter.$lte =
        to;
    }

    const paymentFilter = {
      isNoPayment: false,
    };

    if (
      fromDate &&
      toDate
    ) {
      paymentFilter.paymentDate =
        dateFilter;
    }

    const expenseFilter = {};

    if (
      fromDate &&
      toDate
    ) {
      expenseFilter.date =
        dateFilter;
    }

    const purchaseFilter = {};

    if (
      fromDate &&
      toDate
    ) {
      purchaseFilter.purchaseDate =
        dateFilter;
    }

    const dealerFilter = {};

    if (
      fromDate &&
      toDate
    ) {
      dealerFilter.paymentDate =
        dateFilter;
    }

    const payments =
      await Payment.find(
        paymentFilter
      ).populate(
        'customer',
        'name package'
      );

    const packages =
      await Package.find({});

    const dealerReceive =
      await DealerPayment.find({
        ...dealerFilter,

        paymentType:
          'receive_payment',
      }).populate(
        'dealer',
        'name commission'
      );

    const expenses =
      await Expense.find(
        expenseFilter
      );

    const purchases =
      await Purchase.find(
        purchaseFilter
      );

    const packageMap = {};

    packages.forEach((p) => {
      packageMap[p.name] = {
        sellingPrice:
          p.sellingPrice ||
          0,

        purchasePrice:
          p.purchasePrice ||
          0,

        profit:
          (p.sellingPrice ||
            0) -
          (p.purchasePrice ||
            0),
      };
    });

    const paymentDetails =
      payments.map((p) => {
        const pkgName =
          p.customer
            ?.package ||
          '';

        const pkg =
          packageMap[
            pkgName
          ];

        const revenue =
          p.amount || 0;

        let profit = 0;
        let cost = 0;

        if (
          pkg &&
          pkg.sellingPrice >
            0
        ) {
          profit =
            revenue *
            (pkg.profit /
              pkg.sellingPrice);

          cost =
            revenue *
            (pkg.purchasePrice /
              pkg.sellingPrice);
        }

        return {
          receiptNo:
            p.receiptNo,

          customer:
            p.customer
              ?.name ||
            'Unknown',

          package:
            pkgName ||
            'N/A',

          month:
            p.month,

          date:
            p.paymentDate,

          amount:
            revenue,

          profit:
            Math.round(
              profit
            ),

          cost:
            Math.round(
              cost
            ),
        };
      });

    const totalPackageProfit =
      paymentDetails.reduce(
        (sum, p) =>
          sum + p.profit,
        0
      );

    const totalCustomerRevenue =
      paymentDetails.reduce(
        (sum, p) =>
          sum + p.amount,
        0
      );

    const totalPackageCost =
      paymentDetails.reduce(
        (sum, p) =>
          sum + p.cost,
        0
      );

    const commissionDetails =
      dealerReceive.map(
        (d) => {
          const rateStr =
            d.dealer
              ?.commission ||
            '0%';

          const rate =
            parseCommissionRate(
              rateStr
            );

          const commission =
            Math.round(
              (d.amount ||
                0) *
                rate
            );

          return {
            receiptNo:
              d.receiptNo,

            dealer:
              d.dealer
                ?.name ||
              'Unknown',

            rate:
              rateStr,

            date:
              d.paymentDate,

            amount:
              d.amount ||
              0,

            commission,
          };
        }
      );

    const totalCommissionProfit =
      commissionDetails.reduce(
        (sum, c) =>
          sum +
          c.commission,
        0
      );

    const totalDealerRevenue =
      commissionDetails.reduce(
        (sum, c) =>
          sum +
          c.amount,
        0
      );

    const totalExpenses =
      expenses.reduce(
        (sum, e) =>
          sum +
          (e.amount || 0),
        0
      );

    const totalPurchases =
      purchases.reduce(
        (sum, p) =>
          sum +
          (p.amount || 0),
        0
      );

    const salary =
      await getSalaryCost(
        fromDate,
        toDate
      );

    const totalSalaries =
      salary.totalSalaries;

    const totalCosts =
      totalExpenses +
      totalPurchases +
      totalSalaries;

    const grossProfit =
      totalPackageProfit +
      totalCommissionProfit;

    const netProfit =
      grossProfit -
      totalCosts;

    const monthlyMap = {};

    const bumpMonth = (
      date,
      key,
      value
    ) => {
      if (!date) return;

      const d =
        new Date(date);

      const monthKey = `${d.getFullYear()}-${String(
        d.getMonth() + 1
      ).padStart(
        2,
        '0'
      )}`;

      if (
        !monthlyMap[
          monthKey
        ]
      ) {
        monthlyMap[
          monthKey
        ] = {
          month:
            monthKey,

          packageProfit: 0,

          commissionProfit: 0,

          salaries: 0,

          expenses: 0,

          purchases: 0,

          netProfit: 0,
        };
      }

      monthlyMap[
        monthKey
      ][key] += value;
    };

    paymentDetails.forEach(
      (p) =>
        bumpMonth(
          p.date,
          'packageProfit',
          p.profit
        )
    );

    commissionDetails.forEach(
      (c) =>
        bumpMonth(
          c.date,
          'commissionProfit',
          c.commission
        )
    );

    expenses.forEach((e) =>
      bumpMonth(
        e.date,
        'expenses',
        e.amount || 0
      )
    );

    purchases.forEach((p) =>
      bumpMonth(
        p.purchaseDate,
        'purchases',
        p.amount || 0
      )
    );

    if (
      salary.monthlySalary >
      0
    ) {
      Object.keys(
        monthlyMap
      ).forEach((key) => {
        monthlyMap[
          key
        ].salaries =
          salary.monthlySalary;
      });
    }

    const monthlyBreakdown =
      Object.values(
        monthlyMap
      )
        .map((m) => ({
          ...m,

          netProfit:
            m.packageProfit +
            m.commissionProfit -
            m.salaries -
            m.expenses -
            m.purchases,
        }))
        .sort((a, b) =>
          a.month.localeCompare(
            b.month
          )
        );

    res.json({
      success: true,

      report: {
        totalCustomerRevenue,

        totalDealerRevenue,

        totalRevenue:
          totalCustomerRevenue +
          totalDealerRevenue,

        totalPackageProfit,

        totalCommissionProfit,

        grossProfit,

        totalPackageCost,

        totalExpenses,

        totalPurchases,

        totalSalaries,

        totalCosts,

        netProfit,

        isProfit:
          netProfit >= 0,

        paymentDetails,

        commissionDetails,

        salaryBreakdown:
          salary.breakdown,

        monthlyBreakdown,

        meta: {
          paymentCount:
            payments.length,

          dealerPaymentCount:
            dealerReceive.length,

          expenseCount:
            expenses.length,

          purchaseCount:
            purchases.length,

          staffCount:
            salary.staffCount,

          monthsInRange:
            salary.monthsInRange,

          monthlySalaryTotal:
            salary.monthlySalary,
        },
      },
    });
  } catch (error) {
    logger.error(
      `P&L report error: ${error.message}`
    );

    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// ============================================================
// DASHBOARD SUMMARY
// DO NOT REMOVE - YOUR TOP STAT GRID USES THIS
// ============================================================

exports.getDashboardSummary = async (req, res) => {
  try {
    const now = new Date();

    const startOfMonth =
      new Date(
        now.getFullYear(),
        now.getMonth(),
        1
      );

    const endOfMonth =
      new Date(
        now.getFullYear(),
        now.getMonth() +
          1,
        0,
        23,
        59,
        59,
        999
      );

    const totalCustomers =
      await Customer.countDocuments(
        {}
      );

    const activeCustomers =
      await Customer.countDocuments({
        status: 'active',
      });

    const payments =
      await Payment.find({
        isNoPayment: false,

        paymentDate: {
          $gte:
            startOfMonth,

          $lte:
            endOfMonth,
        },
      }).populate(
        'customer',
        'name package'
      );

    const totalCollected =
      payments.reduce(
        (sum, p) =>
          sum +
          (p.amount || 0),
        0
      );

    const customers =
      await Customer.find(
        {}
      );

    const monthlyReceivable =
      customers.reduce(
        (sum, c) =>
          sum +
          (c.monthlyFee ||
            0),
        0
      );

    const recoveryRate =
      monthlyReceivable >
      0
        ? Math.min(
            100,

            Math.round(
              (totalCollected /
                monthlyReceivable) *
                100
            )
          )
        : 0;

    const allPayments =
      await Payment.find({
        isNoPayment: false,
      });

    const customerPayMap =
      {};

    allPayments.forEach(
      (p) => {
        const cid =
          p.customer?.toString();

        if (!cid) return;

        if (
          !customerPayMap[
            cid
          ]
        ) {
          customerPayMap[
            cid
          ] = {};
        }

        if (
          !customerPayMap[
            cid
          ][p.month]
        ) {
          customerPayMap[
            cid
          ][p.month] = 0;
        }

        customerPayMap[
          cid
        ][p.month] +=
          p.amount || 0;
      }
    );

    let totalOutstanding = 0;
    let defaulterCount = 0;

    customers.forEach(
      (c) => {
        const monthlyFee =
          c.monthlyFee ||
          0;

        if (
          monthlyFee ===
          0
        ) {
          return;
        }

        const paid =
          customerPayMap[
            c._id.toString()
          ] || {};

        const activeMonths =
          Object.keys(
            paid
          );

        let custOutstanding = 0;

        if (
          activeMonths.length ===
          0
        ) {
          custOutstanding =
            monthlyFee;
        } else {
          activeMonths.forEach(
            (month) => {
              custOutstanding +=
                Math.max(
                  0,

                  monthlyFee -
                    paid[
                      month
                    ]
                );
            }
          );
        }

        if (
          custOutstanding >
          0
        ) {
          totalOutstanding +=
            custOutstanding;

          defaulterCount +=
            1;
        }
      }
    );

    const packages =
      await Package.find({});

    const packageMap = {};

    packages.forEach(
      (p) => {
        packageMap[
          p.name
        ] = {
          sellingPrice:
            p.sellingPrice ||
            0,

          profit:
            (p.sellingPrice ||
              0) -
            (p.purchasePrice ||
              0),
        };
      }
    );

    let packageProfitMonth = 0;

    for (
      const p of payments
    ) {
      const pkg =
        packageMap[
          p.customer
            ?.package
        ];

      if (
        pkg &&
        pkg.sellingPrice >
          0
      ) {
        const ratio =
          pkg.profit /
          pkg.sellingPrice;

        packageProfitMonth +=
          (p.amount ||
            0) *
          ratio;
      }
    }

    const monthDealerReceived =
      await DealerPayment.find({
        paymentType:
          'receive_payment',

        paymentDate: {
          $gte:
            startOfMonth,

          $lte:
            endOfMonth,
        },
      }).populate(
        'dealer',
        'commission'
      );

    let commissionProfitMonth = 0;

    for (
      const d of
      monthDealerReceived
    ) {
      const rate =
        parseCommissionRate(
          d.dealer
            ?.commission
        );

      commissionProfitMonth +=
        (d.amount ||
          0) *
        rate;
    }

    const monthExpenses =
      await Expense.find({
        date: {
          $gte:
            startOfMonth,

          $lte:
            endOfMonth,
        },
      });

    const monthPurchases =
      await Purchase.find({
        purchaseDate: {
          $gte:
            startOfMonth,

          $lte:
            endOfMonth,
        },
      });

    const monthExpenseTotal =
      monthExpenses.reduce(
        (sum, e) =>
          sum +
          (e.amount || 0),
        0
      );

    const monthPurchaseTotal =
      monthPurchases.reduce(
        (sum, p) =>
          sum +
          (p.amount || 0),
        0
      );

    const activeStaff =
      await Staff.find({
        isActive: true,
      });

    const monthlySalaryTotal =
      activeStaff.reduce(
        (sum, st) =>
          sum +
          (st.salary || 0),
        0
      );

    const netProfit =
      Math.round(
        packageProfitMonth +
          commissionProfitMonth -
          monthExpenseTotal -
          monthPurchaseTotal -
          monthlySalaryTotal
      );

    res.json({
      success: true,

      summary: {
        totalCustomers,

        activeCustomers,

        inactiveCustomers:
          totalCustomers -
          activeCustomers,

        totalCollected,

        monthlyReceivable,

        recoveryRate,

        totalOutstanding,

        defaulterCount,

        netProfit,

        isProfit:
          netProfit >= 0,

        totalSalaries:
          monthlySalaryTotal,

        monthLabel: `${
          MONTHS[
            now.getMonth()
          ]
        } ${now.getFullYear()}`,
      },
    });
  } catch (error) {
    logger.error(
      `Dashboard summary error: ${error.message}`
    );

    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};