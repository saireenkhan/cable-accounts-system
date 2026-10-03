const PartnerPaymentModel = require('../models/PartnerPayment');
const PartnerModel = require('../models/Partner');
const logger = require('../utils/logger');
const tenantScope = require('../utils/tenantScope');

// Fields populated on every payment response
const PARTNER_POPULATE_FIELDS =
  'name code partnerId phone monthlyFee area isp package status';

// ============================================================
// Generate unique receipt number
// (takes the tenant-scoped model so the lookup actually runs)
// ============================================================
const generateReceiptNo = async (PartnerPayment) => {
  try {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;

    const lastPayment = await PartnerPayment.findOne({
      receiptNo: { $regex: `^PRC-${dateStr}` },
    }).sort({ receiptNo: -1 });

    let sequence = 1;
    if (lastPayment) {
      const lastSeq = parseInt(lastPayment.receiptNo.split('-')[2]);
      if (!isNaN(lastSeq)) {
        sequence = lastSeq + 1;
      }
    }

    return `PRC-${dateStr}-${String(sequence).padStart(3, '0')}`;
  } catch (error) {
    console.error('❌ generateReceiptNo error:', error.message);
    const dateStr = `${Date.now()}`.slice(-10);
    return `PRC-${dateStr}-${String(Math.floor(Math.random() * 900) + 100)}`;
  }
};

// ============================================================
// GET all partner payments
// ============================================================
exports.getPartnerPayments = async (req, res) => {
  const PartnerPayment = tenantScope(PartnerPaymentModel, req);
  try {
    const { partnerId, month } = req.query;
    const filter = {};

    if (partnerId) filter.partner = partnerId;
    if (month) filter.month = month;

    console.log('📥 getPartnerPayments called with filter:', filter);

    const payments = await PartnerPayment.find(filter)
      .populate('partner', PARTNER_POPULATE_FIELDS)
      .populate('receivedBy', 'name')
      .sort({ paymentDate: -1 });

    console.log(`✅ Returning ${payments.length} partner payments`);

    res.json({ success: true, payments });
  } catch (error) {
    console.error('❌ Get partner payments error:', error.message);
    console.error('❌ Stack:', error.stack);
    logger.error(`Get partner payments error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

// ============================================================
// Recalculate partner status
// (takes the tenant-scoped model so the lookup actually runs)
// ============================================================
const recalculatePartnerStatus = async (PartnerPayment, partnerDoc) => {
  try {
    const monthlyFee = parseFloat(partnerDoc.monthlyFee) || 0;

    if (monthlyFee === 0) {
      partnerDoc.status = 'active';
      await partnerDoc.save();
      return 'active';
    }

    const allPayments = await PartnerPayment.find({
      partner: partnerDoc._id,
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
    partnerDoc.status = status;
    await partnerDoc.save();
    return status;
  } catch (error) {
    console.error('❌ recalculatePartnerStatus error:', error.message);
    return partnerDoc.status;
  }
};

// ============================================================
// CREATE partner payment
// Matches the exact logic of normal Customer Payments:
// - No-payment creates a fresh record
// - First regular payment creates a record
// - Additional payment for same partner + month is MERGED
// - Overpayment is rejected
// ============================================================
exports.createPartnerPayment = async (req, res) => {
  const Partner = tenantScope(PartnerModel, req);
  const PartnerPayment = tenantScope(PartnerPaymentModel, req);

  try {
    const {
      partner,
      month,
      amount,
      method,
      paymentMethod,
      paymentDate,
      date,
      remarks,
      isNoPayment,
    } = req.body;

    console.log('📝 Creating partner payment with data:', req.body);

    // ----------------------------------------------------------
    // Find partner
    // ----------------------------------------------------------
    let partnerDoc;

    if (typeof partner === 'object' && partner?._id) {
      partnerDoc = await Partner.findById(partner._id);
    } else if (typeof partner === 'string') {
      const looksLikeObjectId = /^[a-fA-F0-9]{24}$/.test(partner);

      if (looksLikeObjectId) {
        partnerDoc = await Partner.findById(partner);
      } else {
        partnerDoc = await Partner.findOne({ name: partner });
      }
    }

    if (!partnerDoc) {
      return res.status(404).json({
        success: false,
        message: 'Partner not found',
      });
    }

    console.log(
      '👤 Partner:',
      partnerDoc.name,
      'Monthly Fee:',
      partnerDoc.monthlyFee
    );

    // ----------------------------------------------------------
    // Payment values
    // ----------------------------------------------------------
    const paymentAmount = parseFloat(amount) || 0;
    const monthlyFee = parseFloat(partnerDoc.monthlyFee) || 0;

    let paymentMethodValue = paymentMethod || method || 'Cash';

    if (typeof paymentMethodValue === 'string') {
      paymentMethodValue = paymentMethodValue
        .toLowerCase()
        .replace(/ /g, '_');
    } else {
      paymentMethodValue = 'cash';
    }

    const paymentDateObj =
      paymentDate || date
        ? new Date(date || paymentDate)
        : new Date();

    // ----------------------------------------------------------
    // NO PAYMENT
    // Always create a fresh record
    // ----------------------------------------------------------
    if (isNoPayment) {
      const receiptNo = await generateReceiptNo(PartnerPayment);

      const payment = await PartnerPayment.create({
        receiptNo,
        partner: partnerDoc._id,
        month,
        amount: 0,
        packagePrice: monthlyFee,
        paymentDate: paymentDateObj,
        paymentMethod: paymentMethodValue,
        receivedBy: req.user ? req.user.id : null,
        remarks: remarks || 'No payment received',
        isNoPayment: true,
      });

      const populated = await PartnerPayment.findById(payment._id)
        .populate('partner', PARTNER_POPULATE_FIELDS)
        .populate('receivedBy', 'name');

      return res.status(201).json({
        success: true,
        payment: populated,
        partner: partnerDoc,
        message: 'No payment recorded',
      });
    }

    // ----------------------------------------------------------
    // REGULAR PAYMENT
    // Merge if a record for this partner + month already exists
    // ----------------------------------------------------------
    const existingPayment = await PartnerPayment.findOne({
      partner: partnerDoc._id,
      month,
      isNoPayment: false,
    });

    // ----------------------------------------------------------
    // Existing payment found → MERGE
    // ----------------------------------------------------------
    if (existingPayment) {
      const currentAmount = parseFloat(existingPayment.amount) || 0;
      const newTotal = currentAmount + paymentAmount;

      // Prevent overpayment
      if (monthlyFee > 0 && newTotal > monthlyFee) {
        return res.status(400).json({
          success: false,
          message:
            `Overpayment not allowed. ${partnerDoc.name} has already paid ` +
            `Rs. ${currentAmount.toLocaleString()} for ${month}. ` +
            `Remaining balance is only Rs. ` +
            `${(monthlyFee - currentAmount).toLocaleString()}.`,
        });
      }

      // Merge amount into existing record
      existingPayment.amount = newTotal;

      // Match Customer Payment behavior:
      // update payment date to latest payment date
      existingPayment.paymentDate = paymentDateObj;

      // Append remarks instead of replacing old remarks
      if (remarks) {
        existingPayment.remarks = existingPayment.remarks
          ? `${existingPayment.remarks}\n${remarks}`
          : remarks;
      }

      await existingPayment.save();

      console.log('✅ Partner payment merged. New total:', newTotal);

      // Recalculate partner status
      await recalculatePartnerStatus(
        PartnerPayment,
        partnerDoc
      );

      const populated = await PartnerPayment.findById(
        existingPayment._id
      )
        .populate('partner', PARTNER_POPULATE_FIELDS)
        .populate('receivedBy', 'name');

      return res.status(200).json({
        success: true,
        payment: populated,
        partner: partnerDoc,
        message:
          `Additional payment of Rs. ${paymentAmount.toLocaleString()} ` +
          `recorded. Total for ${month}: ` +
          `Rs. ${newTotal.toLocaleString()}`,
      });
    }

    // ----------------------------------------------------------
    // NO EXISTING RECORD → CREATE NEW
    // ----------------------------------------------------------
    const receiptNo = await generateReceiptNo(PartnerPayment);

    const payment = await PartnerPayment.create({
      receiptNo,
      partner: partnerDoc._id,
      month,
      amount: paymentAmount,
      packagePrice: monthlyFee,
      paymentDate: paymentDateObj,
      paymentMethod: paymentMethodValue,
      receivedBy: req.user ? req.user.id : null,
      remarks: remarks || '',
      isNoPayment: false,
    });

    console.log('✅ Partner payment created:', payment.receiptNo);

    // Recalculate partner status
    await recalculatePartnerStatus(
      PartnerPayment,
      partnerDoc
    );

    const populatedPayment = await PartnerPayment.findById(
      payment._id
    )
      .populate('partner', PARTNER_POPULATE_FIELDS)
      .populate('receivedBy', 'name');

    return res.status(201).json({
      success: true,
      payment: populatedPayment,
      partner: partnerDoc,
      message: 'Payment recorded successfully',
    });
  } catch (error) {
    console.error('❌ Create partner payment error:', error);
    console.error('❌ Stack:', error.stack);

    if (error.code === 11000) {
      const keyPattern = error.keyPattern || {};

      if (keyPattern.partner && keyPattern.month) {
        return res.status(400).json({
          success: false,
          message:
            'This partner already has a payment recorded for this month.',
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Duplicate receipt number. Please try again.',
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

// ============================================================
// DELETE partner payment
// ============================================================
exports.deletePartnerPayment = async (req, res) => {
  const PartnerPayment = tenantScope(PartnerPaymentModel, req);
  try {
    const payment = await PartnerPayment.findByIdAndDelete(req.params.id);
    if (!payment) {
      return res.status(404).json({ message: 'Partner payment not found' });
    }
    res.json({ success: true, message: 'Partner payment deleted successfully' });
  } catch (error) {
    logger.error(`Delete partner payment error: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};