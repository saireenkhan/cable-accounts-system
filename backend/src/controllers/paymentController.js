const Payment = require('../models/Payment');
const Customer = require('../models/Customer');
const logger = require('../utils/logger');

// Generate unique receipt number
const generateReceiptNo = async () => {
  try {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;

    const lastPayment = await Payment.findOne({
      receiptNo: { $regex: `^RC-${dateStr}` },
    }).sort({ receiptNo: -1 });

    let sequence = 1;
    if (lastPayment) {
      const lastSeq = parseInt(lastPayment.receiptNo.split('-')[2]);
      if (!isNaN(lastSeq)) {
        sequence = lastSeq + 1;
      }
    }

    return `RC-${dateStr}-${String(sequence).padStart(3, '0')}`;
  } catch (error) {
    const dateStr = `${Date.now()}`.slice(-10);
    return `RC-${dateStr}-${String(Math.floor(Math.random() * 900) + 100)}`;
  }
};

// ============================================================
// GET all payments
// ============================================================
exports.getPayments = async (req, res) => {
  try {
    const { customerId, month } = req.query;
    const filter = {};

    if (customerId) filter.customer = customerId;
    if (month) filter.month = month;

    console.log('📥 getPayments called with filter:', filter);

    const payments = await Payment.find(filter)
      .populate('customer', 'name code customerId phone monthlyFee area package status')
      .populate('receivedBy', 'name')
      .sort({ paymentDate: -1 });

    console.log(`✅ Returning ${payments.length} payments`);

    res.json({ success: true, payments });
  } catch (error) {
    console.error('❌ Get payments error:', error.message);
    console.error('❌ Stack:', error.stack);
    logger.error(`Get payments error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

// ============================================================
// Recalculate customer status
// ============================================================
const recalculateCustomerStatus = async (customerDoc) => {
  try {
    const monthlyFee = parseFloat(customerDoc.monthlyFee) || 0;

    if (monthlyFee === 0) {
      customerDoc.status = 'active';
      await customerDoc.save();
      return 'active';
    }

    const allPayments = await Payment.find({
      customer: customerDoc._id,
      isNoPayment: { $ne: true },
    });

    const monthTotals = {};
    allPayments.forEach((p) => {
      const m = p.month || 'Unknown';
      monthTotals[m] = (monthTotals[m] || 0) + (parseFloat(p.amount) || 0);
    });

    let hasUnpaid = false;
    Object.keys(monthTotals).forEach((m) => {
      if (monthTotals[m] < monthlyFee) {
        hasUnpaid = true;
      }
    });

    const status = hasUnpaid ? 'inactive' : 'active';
    customerDoc.status = status;
    await customerDoc.save();
    return status;
  } catch (error) {
    console.error('❌ recalculateCustomerStatus error:', error.message);
    return customerDoc.status;
  }
};

// ============================================================
// CREATE payment
// ============================================================
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
      isNoPayment,
    } = req.body;

    console.log('📝 Creating payment with data:', req.body);

    let customerDoc;
    if (typeof customer === 'object' && customer._id) {
      customerDoc = await Customer.findById(customer._id);
    } else if (typeof customer === 'string') {
      customerDoc = await Customer.findOne({ name: customer });
    }

    if (!customerDoc) {
      return res.status(404).json({
        success: false,
        message: `Customer not found`,
      });
    }

    console.log('👤 Customer:', customerDoc.name, 'Monthly Fee:', customerDoc.monthlyFee);

    let paymentMethodValue = paymentMethod || method || 'Cash';
    if (typeof paymentMethodValue === 'string') {
      paymentMethodValue = paymentMethodValue.toLowerCase().replace(/ /g, '_');
    } else {
      paymentMethodValue = 'cash';
    }

    const receiptNo = await generateReceiptNo();
    const paymentAmount = parseFloat(amount) || 0;
    const monthlyFee = parseFloat(customerDoc.monthlyFee) || 0;

    const payment = await Payment.create({
      receiptNo,
      customer: customerDoc._id,
      month: month,
      amount: paymentAmount,
      packagePrice: monthlyFee,
      paymentDate: paymentDate || date ? new Date(date || paymentDate) : new Date(),
      paymentMethod: paymentMethodValue,
      receivedBy: req.user ? req.user.id : null,
      remarks: remarks || '',
      isNoPayment: isNoPayment || false,
    });

    console.log('✅ Payment created:', payment.receiptNo);

    if (!isNoPayment && paymentAmount > 0) {
      await recalculateCustomerStatus(customerDoc);
    }

    const populatedPayment = await Payment.findById(payment._id)
      .populate('customer', 'name code customerId phone monthlyFee area package status')
      .populate('receivedBy', 'name');

    res.status(201).json({
      success: true,
      payment: populatedPayment,
      customer: customerDoc,
      message: isNoPayment ? 'No payment recorded' : 'Payment recorded successfully',
    });
  } catch (error) {
    console.error('❌ Create payment error:', error);
    console.error('❌ Stack:', error.stack);

    if (error.code === 11000) {
      return res.status(500).json({
        success: false,
        message: 'Duplicate receipt number. Please try again.',
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

// ============================================================
// DELETE payment
// ============================================================
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