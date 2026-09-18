const Customer = require('../../models/Customer');
const Package = require('../../models/Package');
const { sendText } = require('./client');
const templates = require('./templates');

/**
 * Calculate days remaining until expiry.
 * Positive = days left, 0 = expires today, negative = expired.
 */
function daysUntilExpiry(expiryDate) {
  if (!expiryDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(expiryDate);
  exp.setHours(0, 0, 0, 0);
  return Math.round((exp - today) / (1000 * 60 * 60 * 24));
}

/**
 * Compute the status string the bot will show.
 */
function computeStatus(customer) {
  const daysLeft = daysUntilExpiry(customer.expiryDate);

  let status = 'Unknown';
  if (daysLeft === null) {
    status = 'Unknown';
  } else if (daysLeft < 0) {
    status = 'Expired';
  } else if (customer.status === 'suspended') {
    status = 'Suspended';
  } else if (daysLeft <= 7) {
    status = 'Expiring Soon';
  } else {
    status = 'Active';
  }

  return {
    status,
    daysLeft,
    monthlyFee: customer.monthlyFee || 0,
  };
}

/**
 * Handle the "packages" intent.
 */
async function handlePackages(to) {
  const packages = await Package.find({ isActive: true }).sort({ sellingPrice: 1 });
  const msg = templates.packagesList(packages);
  await sendText(to, msg);
  return { intent: 'packages', reply: msg };
}

/**
 * Handle the "expiry" intent — asks for the Customer ID.
 */
async function handleExpiryAskId(to) {
  const msg = templates.askForCustomerId();
  await sendText(to, msg);
  return { intent: 'expiry_ask_id', reply: msg };
}

/**
 * Handle the "customer_id" intent — looks up the customer and replies with expiry.
 * @param {string} to - sender phone (E.164, no '+')
 * @param {string} rawId - the message body the user sent
 * @param {object} opts - { requirePhoneMatch: boolean }
 */
async function handleCustomerId(to, rawId, opts = { requirePhoneMatch: true }) {
  const id = String(rawId || '').trim().toUpperCase();

  // Search by customerId (case-insensitive) — adjust if your field differs.
  const customer = await Customer.findOne({
    customerId: { $regex: new RegExp(`^${id}$`, 'i') },
  });

  if (!customer) {
    const msg = templates.customerNotFound();
    await sendText(to, msg);
    return { intent: 'customer_id', customerId: null, reply: msg, found: false };
  }

  // Optional: enforce that the sender's phone matches the customer's phone.
  if (opts.requirePhoneMatch) {
    const normalizedCustomerPhone = String(customer.phone || '').replace(/\D/g, '');
    const normalizedSender = String(to || '').replace(/\D/g, '');

    // Compare last 10 digits (loose match handles +92 vs 0 prefix differences).
    const cLast10 = normalizedCustomerPhone.slice(-10);
    const sLast10 = normalizedSender.slice(-10);

    if (cLast10 && sLast10 && cLast10 !== sLast10) {
      const msg = templates.customerNotFound();
      await sendText(to, msg);
      return {
        intent: 'customer_id',
        customerId: customer._id,
        reply: msg,
        found: false,
        phoneMismatch: true,
      };
    }
  }

  const statusInfo = computeStatus(customer);
  const msg = templates.expiryDetails(customer, statusInfo);
  await sendText(to, msg);
  return {
    intent: 'customer_id',
    customerId: customer._id,
    reply: msg,
    found: true,
  };
}

/**
 * Handle greeting.
 */
async function handleGreeting(to) {
  const msg = templates.greeting();
  await sendText(to, msg);
  return { intent: 'greeting', reply: msg };
}

/**
 * Handle help.
 */
async function handleHelp(to) {
  const msg = templates.helpMenu();
  await sendText(to, msg);
  return { intent: 'help', reply: msg };
}

/**
 * Handle fallback.
 */
async function handleFallback(to) {
  const msg = templates.fallback();
  await sendText(to, msg);
  return { intent: 'fallback', reply: msg };
}

module.exports = {
  handlePackages,
  handleExpiryAskId,
  handleCustomerId,
  handleGreeting,
  handleHelp,
  handleFallback,
  computeStatus,
  daysUntilExpiry,
};