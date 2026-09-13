const Customer = require('../models/Customer');
const Area = require('../models/Area');
const Payment = require('../models/Payment');
const logger = require('../utils/logger');

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
        { code: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    if (status) filter.status = status;
    if (area) filter.area = area;

    let query = Customer.find(filter)
      .populate('area', 'name')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });

    if (limit) {
      query = query.limit(parseInt(limit));
    }

    const customers = await query;

    res.json({ success: true, customers });
  } catch (error) {
    logger.error(`Get customers error: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
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
      return res.status(404).json({ message: 'Customer not found' });
    }

    res.json({ success: true, customer });
  } catch (error) {
    logger.error(`Get customer error: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
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
    } = req.body;

    console.log('📝 Creating customer with data:', req.body);

    // ✅ Validate required fields
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

    // ✅ Check for duplicate customerId
    const existingCustomerId = await Customer.findOne({ customerId });
    if (existingCustomerId) {
      return res.status(400).json({
        success: false,
        message: `User ID "${customerId}" already exists. Please use a different ID.`,
      });
    }

    // ✅ Find area by name if provided
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

    // ✅ Generate unique customer code
    const lastCustomer = await Customer.findOne({
      code: { $regex: /^LC-\d+$/ },
    }).sort({ code: -1 });

    let nextNumber = 1;
    if (lastCustomer && lastCustomer.code) {
      const lastNum = parseInt(lastCustomer.code.replace('LC-', ''));
      if (!isNaN(lastNum)) {
        nextNumber = lastNum + 1;
      }
    }

    let code = `LC-${String(nextNumber).padStart(4, '0')}`;

    // ✅ Safety loop
    let attempts = 0;
    while ((await Customer.findOne({ code })) && attempts < 100) {
      nextNumber++;
      code = `LC-${String(nextNumber).padStart(4, '0')}`;
      attempts++;
    }

    if (attempts >= 100) {
      return res.status(500).json({
        success: false,
        message: 'Could not generate unique customer code. Please try again.',
      });
    }

    // ✅ Parse discount
    const parsedDiscount = parseFloat(discount) || 0;

    // ✅ Create customer
    const customer = await Customer.create({
      customerId,
      code,
      name,
      phone,
      cnic: cnic || '',
      address,
      area: areaDoc ? areaDoc._id : null,
      package: pkg,
      discount: parsedDiscount,
      monthlyFee: parseFloat(monthlyFee) || 0,
      status: status || 'active',
      createdBy: req.user ? req.user.id : null,
    });

    const populatedCustomer = await Customer.findById(customer._id)
      .populate('area', 'name')
      .populate('createdBy', 'name');

    console.log(
      '✅ Customer created:',
      populatedCustomer.customerId,
      'Code:',
      populatedCustomer.code,
      'Discount:',
      populatedCustomer.discount
    );

    res.status(201).json({
      success: true,
      customer: populatedCustomer,
      message: 'Customer created successfully',
    });
  } catch (error) {
    console.error('❌ Create customer error:', error);

    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(400).json({
        success: false,
        message: `Duplicate ${field}: "${error.keyValue[field]}" already exists. Please try again.`,
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
    } = req.body;

    const update = {};

    if (customerId !== undefined) update.customerId = customerId;
    if (name !== undefined) update.name = name;
    if (phone !== undefined) update.phone = phone;
    if (cnic !== undefined) update.cnic = cnic;
    if (address !== undefined) update.address = address;
    if (status !== undefined) update.status = status;

    // ✅ Resolve area name → ObjectId
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

    if (pkg !== undefined) update.package = pkg;

    // ✅ Discount update
    if (discount !== undefined) {
      update.discount = parseFloat(discount) || 0;
    }

    if (monthlyFee !== undefined) {
      update.monthlyFee = parseFloat(monthlyFee) || 0;
    }

    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true, runValidators: true }
    )
      .populate('area', 'name')
      .populate('package', 'name sellingPrice');

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    console.log(
      '✅ Customer updated:',
      customer.customerId,
      'Discount:',
      customer.discount
    );

    res.json({
      success: true,
      customer,
      message: 'Customer updated successfully',
    });
  } catch (error) {
    console.error('Update customer error:', error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A customer with this ID or code already exists',
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
      return res.status(404).json({ message: 'Customer not found' });
    }
    res.json({ success: true, message: 'Customer deleted successfully' });
  } catch (error) {
    logger.error(`Delete customer error: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

// ============================================================
// GET dashboard stats
// ============================================================
exports.getDashboardStats = async (req, res) => {
  try {
    const totalCustomers = await Customer.countDocuments();
    const activeCustomers = await Customer.countDocuments({ status: 'active' });
    const expiredCustomers = await Customer.countDocuments({ status: 'expired' });

    const customers = await Customer.find();
    const totalBilling = customers.reduce(
      (sum, c) => sum + (c.monthlyFee || 0),
      0
    );

    const payments = await Payment.find({ isNoPayment: { $ne: true } });
    const totalCollection = payments.reduce(
      (sum, p) => sum + (p.amount || 0),
      0
    );

    const outstanding = Math.max(0, totalBilling - totalCollection);
    const recoveryRate =
      totalBilling > 0 ? (totalCollection / totalBilling) * 100 : 0;

    // Area-wise collection
    const areaPaymentMap = {};
    const populatedPayments = await Payment.find({
      isNoPayment: { $ne: true },
    })
      .populate('customer', 'name area')
      .populate({ path: 'customer', populate: { path: 'area', select: 'name' } });

    populatedPayments.forEach((p) => {
      const areaName = p.customer?.area?.name || 'Unknown';
      areaPaymentMap[areaName] =
        (areaPaymentMap[areaName] || 0) + (p.amount || 0);
    });

    const areaWise = Object.entries(areaPaymentMap)
      .map(([name, total]) => ({ _id: name, total }))
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
    logger.error(`Dashboard stats error: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};