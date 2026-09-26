const Customer = require('../models/Customer');
const Area = require('../models/Area');
const Payment = require('../models/Payment');
const logger = require('../utils/logger');

// ============================================================
// HELPER: Calculate expiry date
// One calendar month after activation date
// Example: 12 Sep -> 12 Oct
// ============================================================
const calculateExpiryDate = (activationDate) => {
  if (!activationDate) return null;

  const date = new Date(activationDate);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  date.setMonth(date.getMonth() + 1);

  return date;
};

// ============================================================
// GET all customers
// ============================================================
exports.getCustomers = async (req, res) => {
  try {
    const { search, status, area, limit } = req.query;
    const filter = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { customerId: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    if (status) filter.status = status;
    if (area) filter.area = area;

    let query = Customer.find(filter)
      .populate('area', 'name')
      .populate('createdBy', 'name')
      .sort({ customerId: 1 });

    if (limit) {
      query = query.limit(parseInt(limit));
    }

    const customers = await query;

    res.json({
      success: true,
      customers,
    });
  } catch (error) {
    logger.error(`Get customers error: ${error.message}`);

    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// ============================================================
// GET single customer
// ============================================================
exports.getCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id)
      .populate('area', 'name')
      .populate('createdBy', 'name');

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    res.json({
      success: true,
      customer,
    });
  } catch (error) {
    logger.error(`Get customer error: ${error.message}`);

    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// ============================================================
// CREATE customer
// ============================================================
exports.createCustomer = async (req, res) => {
  try {
    const {
      customerId,
      name,
      phone,
      cnic,
      address,
      area,
      package: pkg,
      discount,
      monthlyFee,
      status,
      activationDate,
    } = req.body;

    console.log('📝 Creating customer with data:', req.body);

    // --------------------------------------------------------
    // Required fields
    // --------------------------------------------------------
    if (!customerId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
      });
    }

    if (!name || !phone || !address) {
      return res.status(400).json({
        success: false,
        message: 'Name, phone, and address are required',
      });
    }

    // --------------------------------------------------------
    // Duplicate customer ID
    // --------------------------------------------------------
    const existingCustomerId = await Customer.findOne({ customerId });

    if (existingCustomerId) {
      return res.status(400).json({
        success: false,
        message: `User ID "${customerId}" already exists. Please use a different ID.`,
      });
    }

    // --------------------------------------------------------
    // Area
    // --------------------------------------------------------
    let areaDoc = null;

    if (area) {
      areaDoc = await Area.findOne({ name: area });

      if (!areaDoc) {
        areaDoc = await Area.create({
          name: area,
          code: area.substring(0, 3).toUpperCase(),
          isActive: true,
        });
      }
    }

    // --------------------------------------------------------
    // Discount
    // --------------------------------------------------------
    const parsedDiscount = parseFloat(discount) || 0;

    if (parsedDiscount < 0) {
      return res.status(400).json({
        success: false,
        message: 'Discount cannot be negative.',
      });
    }

    // --------------------------------------------------------
    // Activation + Expiry
    // --------------------------------------------------------
    let parsedActivationDate = null;
    let calculatedExpiryDate = null;

    if (activationDate) {
      parsedActivationDate = new Date(activationDate);

      if (Number.isNaN(parsedActivationDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid activation date.',
        });
      }

      calculatedExpiryDate = calculateExpiryDate(parsedActivationDate);
    }

    // --------------------------------------------------------
    // Create customer
    // --------------------------------------------------------
    const customer = await Customer.create({
      customerId,
      name,
      phone,
      cnic: cnic || '',
      address,

      area: areaDoc ? areaDoc._id : null,

      package: pkg,

      discount: parsedDiscount,

      monthlyFee: parseFloat(monthlyFee) || 0,

      status: status || 'active',

      activationDate: parsedActivationDate,

      expiryDate: calculatedExpiryDate,

      createdBy: req.user ? req.user.id : null,
    });

    // --------------------------------------------------------
    // Populate response
    // --------------------------------------------------------
    const populatedCustomer = await Customer.findById(customer._id)
      .populate('area', 'name')
      .populate('createdBy', 'name');

    console.log(
      '✅ Customer created:',
      populatedCustomer.customerId
    );

    res.status(201).json({
      success: true,
      customer: populatedCustomer,
      message: 'Customer created successfully',
    });
  } catch (error) {
    console.error('❌ Create customer error:', error);

    // Duplicate key
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];

      return res.status(400).json({
        success: false,
        message: `Duplicate ${field}: "${error.keyValue[field]}" already exists. Please try again.`,
      });
    }

    // Mongoose validation error
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors)
        .map((err) => err.message)
        .join(', ');

      return res.status(400).json({
        success: false,
        message: messages || 'Validation error',
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

// ============================================================
// UPDATE customer
// ============================================================
exports.updateCustomer = async (req, res) => {
  try {
    const {
      customerId,
      name,
      phone,
      cnic,
      address,
      area,
      package: pkg,
      discount,
      monthlyFee,
      status,
      activationDate,
    } = req.body;

    console.log('📝 Updating customer:', req.params.id);
    console.log('📦 Update data:', req.body);

    // --------------------------------------------------------
    // Find existing customer first
    // --------------------------------------------------------
    const existingCustomer = await Customer.findById(req.params.id);

    if (!existingCustomer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    const update = {};

    // --------------------------------------------------------
    // Basic fields
    // --------------------------------------------------------
    if (customerId !== undefined) {
      update.customerId = customerId;
    }

    if (name !== undefined) {
      update.name = name;
    }

    if (phone !== undefined) {
      update.phone = phone;
    }

    if (cnic !== undefined) {
      update.cnic = cnic;
    }

    if (address !== undefined) {
      update.address = address;
    }

    if (status !== undefined) {
      update.status = status;
    }

    // --------------------------------------------------------
    // Area
    // --------------------------------------------------------
    if (area !== undefined) {
      if (area) {
        const areaDoc = await Area.findOne({ name: area });

        if (areaDoc) {
          update.area = areaDoc._id;
        } else {
          return res.status(400).json({
            success: false,
            message: `Area "${area}" not found`,
          });
        }
      } else {
        update.area = null;
      }
    }

    // --------------------------------------------------------
    // Package
    // --------------------------------------------------------
    if (pkg !== undefined) {
      update.package = pkg;
    }

    // --------------------------------------------------------
    // Discount
    // --------------------------------------------------------
    if (discount !== undefined) {
      const parsedDiscount = parseFloat(discount);

      if (Number.isNaN(parsedDiscount) || parsedDiscount < 0) {
        return res.status(400).json({
          success: false,
          message: 'Discount must be a valid non-negative number.',
        });
      }

      update.discount = parsedDiscount;
    }

    // --------------------------------------------------------
    // Monthly fee
    // --------------------------------------------------------
    if (monthlyFee !== undefined) {
      const parsedMonthlyFee = parseFloat(monthlyFee);

      if (Number.isNaN(parsedMonthlyFee) || parsedMonthlyFee < 0) {
        return res.status(400).json({
          success: false,
          message: 'Monthly fee must be a valid non-negative number.',
        });
      }

      update.monthlyFee = parsedMonthlyFee;
    }

    // --------------------------------------------------------
    // ACTIVATION DATE + EXPIRY DATE
    // --------------------------------------------------------
    if (activationDate !== undefined) {
      if (!activationDate) {
        update.activationDate = null;
        update.expiryDate = null;
      } else {
        const parsedActivationDate = new Date(activationDate);

        if (Number.isNaN(parsedActivationDate.getTime())) {
          return res.status(400).json({
            success: false,
            message: 'Invalid activation date.',
          });
        }

        update.activationDate = parsedActivationDate;

        // Automatically calculate one month later
        update.expiryDate = calculateExpiryDate(
          parsedActivationDate
        );
      }
    }

    // --------------------------------------------------------
    // Update database
    // --------------------------------------------------------
    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      update,
      {
        new: true,
        runValidators: true,
      }
    )
      .populate('area', 'name')
      .populate('createdBy', 'name');

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    console.log('✅ Customer updated:', customer.customerId);

    res.json({
      success: true,
      customer,
      message: 'Customer updated successfully',
    });
  } catch (error) {
    console.error('❌ Update customer error:', error);

    // --------------------------------------------------------
    // Duplicate customer ID
    // --------------------------------------------------------
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A customer with this ID already exists',
      });
    }

    // --------------------------------------------------------
    // Mongoose validation error
    // --------------------------------------------------------
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors)
        .map((err) => err.message)
        .join(', ');

      return res.status(400).json({
        success: false,
        message: messages || 'Validation error',
      });
    }

    // --------------------------------------------------------
    // Invalid ObjectId
    // --------------------------------------------------------
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: `Invalid ${error.path}: ${error.value}`,
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

// ============================================================
// DELETE customer
// ============================================================
exports.deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findByIdAndDelete(req.params.id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    res.json({
      success: true,
      message: 'Customer deleted successfully',
    });
  } catch (error) {
    logger.error(`Delete customer error: ${error.message}`);

    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// ============================================================
// GET dashboard stats
// ============================================================
exports.getDashboardStats = async (req, res) => {
  try {
    const totalCustomers = await Customer.countDocuments();

    const activeCustomers = await Customer.countDocuments({
      status: 'active',
    });

    const expiredCustomers = await Customer.countDocuments({
      status: 'expired',
    });

    const customers = await Customer.find();

    const totalBilling = customers.reduce(
      (sum, c) => sum + (c.monthlyFee || 0),
      0
    );

    const payments = await Payment.find({
      isNoPayment: { $ne: true },
    });

    const totalCollection = payments.reduce(
      (sum, p) => sum + (p.amount || 0),
      0
    );

    const outstanding = Math.max(
      0,
      totalBilling - totalCollection
    );

    const recoveryRate =
      totalBilling > 0
        ? (totalCollection / totalBilling) * 100
        : 0;

    const areaPaymentMap = {};

    const populatedPayments = await Payment.find({
      isNoPayment: { $ne: true },
    })
      .populate('customer', 'name area')
      .populate({
        path: 'customer',
        populate: {
          path: 'area',
          select: 'name',
        },
      });

    populatedPayments.forEach((p) => {
      const areaName =
        p.customer?.area?.name || 'Unknown';

      areaPaymentMap[areaName] =
        (areaPaymentMap[areaName] || 0) +
        (p.amount || 0);
    });

    const areaWise = Object.entries(areaPaymentMap)
      .map(([name, total]) => ({
        _id: name,
        total,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    res.json({
      success: true,
      stats: {
        totalCustomers,
        activeCustomers,
        expiredCustomers,
        totalBilling,
        totalCollection,
        outstanding,
        recoveryRate: Math.round(recoveryRate),
        areaWise,
      },
    });
  } catch (error) {
    logger.error(
      `Dashboard stats error: ${error.message}`
    );

    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};