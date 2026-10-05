// controllers/promiseController.js
const PromiseModel = require('../models/Promise');
const Customer = require('../models/Customer');
const Payment = require('../models/Payment');
const PartnerPayment = require('../models/PartnerPayment');
const Partner = require('../models/Partner');

/* ============================================================
   Sum all money received for a given customer, from BOTH:
     1. Payment.customer  (regular user payments)
     2. PartnerPayment.partner (partner payments, matched by
        partner id if the customer has one, otherwise by name)
   Never throws — returns whatever it can total.
============================================================ */
async function getTotalPaidForCustomer(customerDoc) {
  let total = 0;

  if (!customerDoc) return 0;

  const customerId = customerDoc._id;

  // ---- 1. Regular payments ----------------------------------
  try {
    const regularPayments = await Payment.find({
      customer: customerId,
      isNoPayment: { $ne: true },
    });

    total += regularPayments.reduce((sum, p) => {
      const n = parseFloat(String(p.amount || 0));
      return sum + (isNaN(n) ? 0 : n);
    }, 0);
  } catch (e) {
    console.error('⚠️ regular payments lookup failed:', e.message);
  }

  // ---- 2. Partner payments ----------------------------------
  try {
    let partnerDoc = null;

    // If the Customer schema ever adds a `partner` ref, use it.
    if (customerDoc.partner) {
      const partnerId = customerDoc.partner._id || customerDoc.partner;
      try {
        partnerDoc = await Partner.findById(partnerId);
      } catch (e) {
        console.error('⚠️ Partner lookup by id failed:', e.message);
      }
    }

    // Fallback: same name (matches existing data).
    if (!partnerDoc && customerDoc.name) {
      try {
        partnerDoc = await Partner.findOne({ name: customerDoc.name });
      } catch (e) {
        console.error('⚠️ Partner lookup by name failed:', e.message);
      }
    }

    if (partnerDoc) {
      const partnerPayments = await PartnerPayment.find({
        partner: partnerDoc._id,
        isNoPayment: { $ne: true },
      });

      total += partnerPayments.reduce((sum, p) => {
        const n = parseFloat(String(p.amount || 0));
        return sum + (isNaN(n) ? 0 : n);
      }, 0);
    }
  } catch (e) {
    console.error('⚠️ partner payments lookup failed:', e.message);
  }

  return total;
}

/* ============================================================
   Compute live status from promise date + payments.

   Rules:
   - "Kept" is sticky (money received is a fact).
   - "Broken" / "Today" / "Upcoming" are always recomputed
     from the current date and payment totals.
============================================================ */
async function computeLiveStatus(promise) {
  if (promise.status === 'Kept') {
    return 'Kept';
  }

  let totalPaid = 0;

  try {
    const customerId = promise.customer?._id || promise.customer;
    const customerDoc = await Customer.findById(customerId);
    if (customerDoc) {
      totalPaid = await getTotalPaidForCustomer(customerDoc);
    }
  } catch (e) {
    console.error('⚠️ computeLiveStatus payment lookup failed:', e.message);
  }

  const promisedAmount = Number(promise.promiseAmount || 0);

  // Fully covered → Kept
  if (promisedAmount > 0 && totalPaid >= promisedAmount) {
    return 'Kept';
  }

  // Date-based fallback
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const pd = new Date(promise.promiseDate);
  pd.setHours(0, 0, 0, 0);

  if (pd.getTime() > today.getTime()) return 'Upcoming';
  if (pd.getTime() === today.getTime()) return 'Today';
  return 'Broken';
}

/* ============================================================
   Shared populate config for the `customer` field.
   NOTE: Customer schema has no `partner` field, so we do NOT
   populate it — the total-paid helper resolves the partner
   by name at query time instead.
============================================================ */
const CUSTOMER_POPULATE = {
  path: 'customer',
  select: 'name customerId monthlyFee area phone package',
  populate: [
    { path: 'area', select: 'name' },
    { path: 'package', select: 'name' },
  ],
};

/* ============================================================
   GET /api/promises
============================================================ */
exports.getPromises = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || req.tenantId;

    const filter = {};
    if (tenantId) filter.tenantId = tenantId;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.customer) filter.customer = req.query.customer;

    const promises = await PromiseModel.find(filter)
      .populate(CUSTOMER_POPULATE)
      .sort({ promiseDate: -1, createdAt: -1 });

    const withLiveStatus = await Promise.all(
      promises.map(async (p) => {
        const live = await computeLiveStatus(p);
        p.status = live;
        return p;
      })
    );

    res.json({ success: true, promises: withLiveStatus });
  } catch (err) {
    console.error('getPromises error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/* ============================================================
   GET /api/promises/:id
============================================================ */
exports.getPromise = async (req, res) => {
  try {
    const promise = await PromiseModel.findById(req.params.id).populate(
      CUSTOMER_POPULATE
    );

    if (!promise) {
      return res
        .status(404)
        .json({ success: false, message: 'Promise not found' });
    }

    promise.status = await computeLiveStatus(promise);

    res.json({ success: true, promise });
  } catch (err) {
    console.error('getPromise error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/* ============================================================
   POST /api/promises
============================================================ */
exports.createPromise = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || req.tenantId;

    const {
      customer,
      promiseAmount,
      promiseDate,
      paymentMethod,
      recoveryOfficer,
      promiseSource,
      remarks,
    } = req.body;

    if (!customer) {
      return res
        .status(400)
        .json({ success: false, message: 'Customer is required' });
    }
    if (promiseAmount === undefined || promiseAmount === null) {
      return res
        .status(400)
        .json({ success: false, message: 'Promise amount is required' });
    }
    if (!promiseDate) {
      return res
        .status(400)
        .json({ success: false, message: 'Promise date is required' });
    }

    const customerDoc = await Customer.findById(customer);
    if (!customerDoc) {
      return res
        .status(404)
        .json({ success: false, message: 'Customer not found' });
    }

    const doc = new PromiseModel({
      tenantId,
      customer: customerDoc._id,
      customerName: customerDoc.name,
      customerId: customerDoc.customerId,
      promiseAmount: Number(promiseAmount),
      promiseDate: new Date(promiseDate),
      paymentMethod: paymentMethod || 'Cash',
      recoveryOfficer: recoveryOfficer || '',
      promiseSource: promiseSource || 'Phone Call',
      remarks: remarks || '',
      status: 'Upcoming',
    });

    doc.status = await computeLiveStatus(doc);

    await doc.save();
    await doc.populate(CUSTOMER_POPULATE);

    res.status(201).json({ success: true, promise: doc });
  } catch (err) {
    console.error('createPromise error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/* ============================================================
   PUT /api/promises/:id
   `status` is intentionally NOT editable here — it must be
   recomputed. Use PATCH /:id/status for manual overrides.
============================================================ */
exports.updatePromise = async (req, res) => {
  try {
    const promise = await PromiseModel.findById(req.params.id);
    if (!promise) {
      return res
        .status(404)
        .json({ success: false, message: 'Promise not found' });
    }

    const allowed = [
      'promiseAmount',
      'promiseDate',
      'paymentMethod',
      'recoveryOfficer',
      'promiseSource',
      'remarks',
    ];

    allowed.forEach((key) => {
      if (req.body[key] !== undefined) {
        promise[key] =
          key === 'promiseDate'
            ? new Date(req.body[key])
            : req.body[key];
      }
    });

    promise.status = await computeLiveStatus(promise);

    await promise.save();
    await promise.populate(CUSTOMER_POPULATE);

    res.json({ success: true, promise });
  } catch (err) {
    console.error('updatePromise error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/* ============================================================
   PATCH /api/promises/:id/status
   Manual override for Kept / Broken (e.g. admin marks
   a promise as broken even before the date passes).
============================================================ */
exports.updatePromiseStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['Kept', 'Broken'].includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid status' });
    }

    const promise = await PromiseModel.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate(CUSTOMER_POPULATE);

    if (!promise) {
      return res
        .status(404)
        .json({ success: false, message: 'Promise not found' });
    }

    res.json({ success: true, promise });
  } catch (err) {
    console.error('updatePromiseStatus error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/* ============================================================
   DELETE /api/promises/:id
============================================================ */
exports.deletePromise = async (req, res) => {
  try {
    const promise = await PromiseModel.findByIdAndDelete(req.params.id);
    if (!promise) {
      return res
        .status(404)
        .json({ success: false, message: 'Promise not found' });
    }
    res.json({ success: true, message: 'Promise deleted' });
  } catch (err) {
    console.error('deletePromise error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};