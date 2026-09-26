const Bill = require('../models/Bill');
const Customer = require('../models/Customer');
const Area = require('../models/Area');
const Package = require('../models/Package');
const logger = require('../utils/logger');

const generateBillNo = async () => {
  // ✅ Get the last bill and increment
  const lastBill = await Bill.findOne().sort({ billNo: -1 });
  
  if (!lastBill) {
    return 'B-0001';
  }
  
  // Extract the number part (e.g., "B-0004" -> 4)
  const lastNumber = parseInt(lastBill.billNo.split('-')[1]);
  const newNumber = lastNumber + 1;
  
  // Format with leading zeros (e.g., 4 -> "0004")
  return `B-${String(newNumber).padStart(4, '0')}`;
};

exports.getBills = async (req, res) => {
  try {
    const { month, status, customerId } = req.query;
    const filter = {};
    
    if (month) filter.month = month;
    if (status) filter.status = status;
    if (customerId) filter.customer = customerId;

    const bills = await Bill.find(filter)
      .populate('customer', 'name code phone address')
      .sort({ createdAt: -1 });

    res.json({ success: true, bills });
  } catch (error) {
    logger.error(`Get bills error: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getBill = async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id).populate('customer');
    
    if (!bill) {
      return res.status(404).json({ message: 'Bill not found' });
    }
    
    res.json({ success: true, bill });
  } catch (error) {
    logger.error(`Get bill error: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createBill = async (req, res) => {
  try {
    const { customer, month, totalAmount, paidAmount, status } = req.body;

    console.log('📝 Creating bill with data:', req.body);

    // ✅ Find customer by name
    let customerDoc = await Customer.findOne({ 
      name: { $regex: new RegExp('^' + customer.trim() + '$', 'i') } 
    });
    
    if (!customerDoc) {
      customerDoc = await Customer.findOne({ 
        name: { $regex: customer.trim(), $options: 'i' } 
      });
    }
    
    // ✅ If customer not found, create one
    if (!customerDoc) {
      console.log(`📝 Customer "${customer}" not found. Creating new customer...`);
      
      let defaultArea = await Area.findOne({ name: 'Gulshan Block 1' });
      if (!defaultArea) {
        defaultArea = await Area.create({ 
          name: 'Gulshan Block 1', 
          code: 'GUL-001',
          isActive: true 
        });
      }
      
      let defaultPackage = await Package.findOne({ name: 'BASIC' });
      if (!defaultPackage) {
        defaultPackage = await Package.create({
          name: 'BASIC',
          sellingPrice: 1200,
          purchasePrice: 800,
          bandwidth: '25 Mbps',
          isActive: true
        });
      }
      
      const code = `LC-${String(await Customer.countDocuments() + 1).padStart(4, '0')}`;
      
      customerDoc = await Customer.create({
        code,
        name: customer.trim(),
        phone: 'N/A',
        address: 'N/A',
        area: defaultArea._id,
        package: defaultPackage._id,
        monthlyFee: 1200,
        status: 'active',
        connectionDate: new Date(),
      });
      
      console.log('✅ Created new customer:', customerDoc.name);
    }

    // ✅ Generate unique bill number
    const billNo = await generateBillNo();

    const bill = await Bill.create({
      billNo,
      customer: customerDoc._id,
      month: month,
      year: new Date().getFullYear(),
      totalAmount: parseFloat(totalAmount) || 0,
      paidAmount: parseFloat(paidAmount) || 0,
      status: status || 'pending',
      dueDate: new Date(new Date().setDate(28)),
    });

    const populatedBill = await Bill.findById(bill._id)
      .populate('customer', 'name code phone');

    console.log('✅ Bill created successfully:', populatedBill.billNo);

    res.status(201).json({
      success: true,
      bill: populatedBill,
      message: 'Bill created successfully',
    });
  } catch (error) {
    console.error('❌ Create bill error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

exports.generateMonthlyBills = async (req, res) => {
  try {
    const { month, year } = req.body;
    const monthString = `${month} ${year}`;

    const customers = await Customer.find({ status: 'active' }).populate('package');

    if (customers.length === 0) {
      return res.status(400).json({ message: 'No active customers found' });
    }

    const existingBills = await Bill.find({ month: monthString });
    if (existingBills.length > 0) {
      return res.status(400).json({ 
        message: `Bills already generated for ${monthString}`,
        count: existingBills.length
      });
    }

    const generatedBills = [];
    for (const customer of customers) {
      const billNo = await generateBillNo();
      const bill = await Bill.create({
        billNo,
        customer: customer._id,
        month: monthString,
        year: parseInt(year),
        totalAmount: customer.package.sellingPrice || 0,
        dueDate: new Date(new Date().setDate(28)),
      });
      generatedBills.push(bill);
    }

    res.json({
      success: true,
      message: `Generated ${generatedBills.length} bills for ${monthString}`,
      count: generatedBills.length,
    });
  } catch (error) {
    logger.error(`Generate bills error: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateBillStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const bill = await Bill.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    
    if (!bill) {
      return res.status(404).json({ message: 'Bill not found' });
    }
    
    res.json({ success: true, bill });
  } catch (error) {
    logger.error(`Update bill error: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};