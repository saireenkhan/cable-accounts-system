const Payment = require('../models/Payment');
const Customer = require('../models/Customer');
const logger = require('../utils/logger');

// Generate unique receipt number
const generateReceiptNo = async () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  
  const lastPayment = await Payment.findOne({
    receiptNo: { $regex: `^RC-${dateStr}` }
  }).sort({ receiptNo: -1 });

  let sequence = 1;
  if (lastPayment) {
    const lastSeq = parseInt(lastPayment.receiptNo.split('-')[2]);
    if (!isNaN(lastSeq)) {
      sequence = lastSeq + 1;
    }
  }

  return `RC-${dateStr}-${String(sequence).padStart(3, '0')}`;
};

// @desc    Get all payments
// @route   GET /api/payments
exports.getPayments = async (req, res) => {
  try {
    const { customerId, month } = req.query;
    const filter = {};
    
    if (customerId) filter.customer = customerId;
    if (month) filter.month = month;
    
    const payments = await Payment.find(filter)
      .populate('customer', 'name code phone monthlyFee area package status')
      .populate('receivedBy', 'name')
      .sort({ paymentDate: -1 });

    res.json({ success: true, payments });
  } catch (error) {
    logger.error(`Get payments error: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create payment
// @route   POST /api/payments
exports.createPayment = async (req, res) => {
  try {
    const { 
      customer, 
      month, 
      amount, 
      method, 
      paymentMethod, 
      paymentDate,
      date,
      remarks,
      isNoPayment  // ✅ Accept this field
    } = req.body;

    console.log('📝 Creating payment with data:', req.body);

    // Find customer
    let customerDoc;
    if (typeof customer === 'object' && customer._id) {
      customerDoc = await Customer.findById(customer._id);
    } else if (typeof customer === 'string') {
      customerDoc = await Customer.findOne({ name: customer });
    }

    if (!customerDoc) {
      return res.status(404).json({
        success: false,
        message: `Customer not found`
      });
    }

    console.log('👤 Customer:', customerDoc.name, 'Monthly Fee:', customerDoc.monthlyFee);

    // Handle payment method
    let paymentMethodValue = paymentMethod || method || 'Cash';
    if (typeof paymentMethodValue === 'string') {
      paymentMethodValue = paymentMethodValue.toLowerCase().replace(/ /g, '_');
    } else {
      paymentMethodValue = 'cash';
    }

    const receiptNo = await generateReceiptNo();
    const paymentAmount = parseFloat(amount) || 0;

    // ✅ Create payment record with isNoPayment flag
    const payment = await Payment.create({
      receiptNo,
      customer: customerDoc._id,
      month: month,
      amount: paymentAmount,
      packagePrice: customerDoc.monthlyFee || 0,
      paymentDate: paymentDate || date ? new Date(date || paymentDate) : new Date(),
      paymentMethod: paymentMethodValue,
      receivedBy: req.user ? req.user.id : null,
      remarks: remarks || '',
      isNoPayment: isNoPayment || false  // ✅ Save this flag
    });

    console.log('✅ Payment created:', payment.receiptNo, 'isNoPayment:', payment.isNoPayment);

    // ✅ Only update customer status if it's an actual payment
    if (!isNoPayment && paymentAmount > 0) {
      // Calculate total paid for this month
      const allPaymentsForMonth = await Payment.find({
        customer: customerDoc._id,
        month: month,
        isNoPayment: { $ne: true }  // Exclude no-payment entries
      });

      const totalPaidForMonth = allPaymentsForMonth.reduce((sum, p) => sum + p.amount, 0);
      const monthlyFee = customerDoc.monthlyFee || 0;
      const remainingBalance = Math.max(0, monthlyFee - totalPaidForMonth);

      console.log(`📊 Month: ${month}, Total Paid: ${totalPaidForMonth}, Remaining: ${remainingBalance}`);

      // ✅ Update customer status
      const allMonths = await Payment.distinct('month', { 
        customer: customerDoc._id,
        isNoPayment: { $ne: true }
      });
      
      let hasUnpaid = false;
      
      for (const m of allMonths) {
        const monthPayments = await Payment.find({ 
          customer: customerDoc._id, 
          month: m,
          isNoPayment: { $ne: true }
        });
        const totalPaid = monthPayments.reduce((sum, p) => sum + p.amount, 0);
        if (totalPaid < monthlyFee) {
          hasUnpaid = true;
          break;
        }
      }

      customerDoc.status = hasUnpaid ? 'default' : 'active';
      await customerDoc.save();
    }

    const populatedPayment = await Payment.findById(payment._id)
      .populate('customer', 'name code phone monthlyFee area package status')
      .populate('receivedBy', 'name');

    res.status(201).json({
      success: true,
      payment: populatedPayment,
      customer: customerDoc,
      message: isNoPayment ? 'No payment recorded' : 'Payment recorded successfully',
    });
  } catch (error) {
    console.error('❌ Create payment error:', error);
    
    if (error.code === 11000) {
      return res.status(500).json({
        success: false,
        message: 'Duplicate receipt number. Please try again.'
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: error.message || 'Server error',
    });
  }
};

// @desc    Delete payment
// @route   DELETE /api/payments/:id
exports.deletePayment = async (req, res) => {
  try {
    const payment = await Payment.findByIdAndDelete(req.params.id);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }
    res.json({ success: true, message: 'Payment deleted successfully' });
  } catch (error) {
    logger.error(`Delete payment error: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};