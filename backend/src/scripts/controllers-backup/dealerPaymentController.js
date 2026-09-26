const DealerPayment = require('../models/DealerPayment');
const Dealer = require('../models/Dealer');
const logger = require('../utils/logger');

// ============================================================
// GET all dealer payments
// ============================================================
exports.getDealerPayments = async (req, res) => {
  try {
    const { dealerId, month, paymentType } = req.query;
    const filter = {};

    if (dealerId) filter.dealer = dealerId;
    if (month) filter.month = month;
    if (paymentType) filter.paymentType = paymentType;

    const payments = await DealerPayment.find(filter)
      .populate({
        path: 'dealer',
        select: 'name dealerId cellNo commission area currentBalance',
        populate: {
          path: 'area',
          select: 'name',
        },
      })
      .populate('receivedBy', 'name')
      .sort({ paymentDate: -1 });

    res.json({ success: true, payments });
  } catch (error) {
    logger.error(`Get dealer payments error: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

// ============================================================
// CREATE dealer payment
// ============================================================
exports.createDealerPayment = async (req, res) => {
  try {
    const {
      dealerId,
      amount,
      month,
      paymentMethod,
      remarks,
      paymentType,
      paymentFor,
      paymentDate,
      receiptNo,
      paidBy,
      collectedBy,
    } = req.body;

    console.log('📝 Creating dealer payment:', req.body);

    if (!receiptNo) {
      return res.status(400).json({
        success: false,
        message: 'Receipt number is required',
      });
    }

    if (!dealerId) {
      return res.status(400).json({
        success: false,
        message: 'Dealer is required',
      });
    }

    // ✅ Find dealer by name or ID
    let dealerDoc;
    if (typeof dealerId === 'string') {
      dealerDoc = await Dealer.findOne({ name: dealerId });
      if (!dealerDoc) {
        dealerDoc = await Dealer.findOne({ dealerId });
      }
    } else {
      dealerDoc = await Dealer.findById(dealerId);
    }

    if (!dealerDoc) {
      return res.status(404).json({
        success: false,
        message: `Dealer "${dealerId}" not found`,
      });
    }

    // ✅ Handle payment method
    let methodValue = paymentMethod || 'cash';
    if (typeof methodValue === 'string') {
      methodValue = methodValue.toLowerCase().replace(/ /g, '_');
    }

    // ============================================================
    // ✅ CALCULATE COMMISSION (only for receive_payment)
    // ============================================================
    let commissionAmount = 0;
    let commissionRate = '';

    if (paymentType === 'receive_payment') {
      commissionRate = dealerDoc.commission || '10%';
      const rateNumber =
        parseFloat(String(commissionRate).replace('%', '')) || 0;
      commissionAmount = Math.round(
        (parseFloat(amount) || 0) * (rateNumber / 100)
      );
    }

    // ✅ Create payment
    const payment = await DealerPayment.create({
      receiptNo,
      dealer: dealerDoc._id,
      amount: parseFloat(amount) || 0,
      month:
        month ||
        `${new Date().toLocaleString('default', { month: 'long' })} ${new Date().getFullYear()}`,
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      paymentMethod: methodValue,
      paymentType: paymentType || 'receive_payment',
      paymentFor: paymentFor || '',
      commission: commissionAmount,
      commissionRate: commissionRate,
      paidBy: paidBy || '',
      collectedBy: collectedBy || '',
      receivedBy: req.user ? req.user.id : null,
      remarks: remarks || '',
    });

    // ✅ Update dealer current balance
    dealerDoc.currentBalance =
      (dealerDoc.currentBalance || 0) - parseFloat(amount);
    await dealerDoc.save();

    // ✅ Populate the payment for the response
    const populatedPayment = await DealerPayment.findById(payment._id)
      .populate({
        path: 'dealer',
        select: 'name dealerId cellNo commission area currentBalance',
        populate: {
          path: 'area',
          select: 'name',
        },
      })
      .populate('receivedBy', 'name');

    console.log('✅ Dealer payment created:', populatedPayment.receiptNo);
    console.log('💰 Commission applied:', commissionAmount);

    res.status(201).json({
      success: true,
      payment: populatedPayment,
      message: 'Dealer payment recorded successfully',
    });
  } catch (error) {
    console.error('❌ Create dealer payment error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

// ============================================================
// DELETE dealer payment
// ============================================================
exports.deleteDealerPayment = async (req, res) => {
  try {
    const payment = await DealerPayment.findByIdAndDelete(req.params.id);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }
    res.json({ success: true, message: 'Payment deleted successfully' });
  } catch (error) {
    logger.error(`Delete dealer payment error: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};