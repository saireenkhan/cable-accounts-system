/**
 * Message template builders.
 * Each function returns a string that will be sent as a WhatsApp message.
 */

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function formatDate(date) {
  if (!date) return 'N/A';
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'N/A';
  const day = String(d.getDate()).padStart(2, '0');
  return `${day} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function daysBetween(from, to) {
  const ms = new Date(to).getTime() - new Date(from).getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

/**
 * Greeting / welcome / help menu.
 */
function greeting(name = 'there') {
  return (
    `👋 Hello ${name}!\n\n` +
    `Welcome to *Smart Recovery*.\n\n` +
    `Reply with:\n` +
    `• *packages* — to see all available packages\n` +
    `• *expiry* — to check your subscription expiry\n` +
    `• *help* — to see this menu again`
  );
}

function helpMenu() {
  return (
    `📋 *Menu*\n\n` +
    `• *packages* — see all available packages\n` +
    `• *expiry* — check your subscription expiry\n` +
    `• *help* — show this menu`
  );
}

/**
 * Packages list.
 * @param {Array} packages - array of Package docs
 */
function packagesList(packages) {
  if (!packages || packages.length === 0) {
    return `📦 No packages are currently available. Please check back later.`;
  }

  const lines = packages
    .filter((p) => p.isActive !== false)
    .map((p, i) => {
      const price = Number(p.sellingPrice || 0).toLocaleString();
      return (
        `*${i + 1}. ${p.name}*\n` +
        `   📶 Bandwidth: ${p.bandwidth || 'N/A'}\n` +
        `   💰 Price: Rs. ${price}/month`
      );
    });

  return (
    `📦 *Available Packages*\n\n` +
    lines.join('\n\n') +
    `\n\n_Reply *expiry* to check your subscription expiry._`
  );
}

/**
 * Ask the user for their Customer ID.
 */
function askForCustomerId() {
  return (
    `🔎 Please send your *Customer ID* to check your expiry.\n\n` +
    `Example: *CUS-0012*`
  );
}

/**
 * Customer not found / phone mismatch.
 */
function customerNotFound() {
  return (
    `❌ We couldn't find this ID linked to your WhatsApp number.\n\n` +
    `Please make sure you are messaging from the number registered with us, ` +
    `or contact support.`
  );
}

/**
 * Expiry details for a matched customer.
 * @param {Object} customer - Customer doc
 * @param {Object} statusInfo - { status, daysLeft, monthlyFee }
 */
function expiryDetails(customer, statusInfo = {}) {
  const { status = 'Unknown', daysLeft = null, monthlyFee = 0 } = statusInfo;

  const activation = formatDate(customer.activationDate);
  const expiry = formatDate(customer.expiryDate);

  let statusLine = `⏳ *Status:* ${status}`;
  if (typeof daysLeft === 'number') {
    if (daysLeft > 0) {
      statusLine += ` — ${daysLeft} day${daysLeft === 1 ? '' : 's'} remaining`;
    } else if (daysLeft === 0) {
      statusLine += ` — expires *today*`;
    } else {
      statusLine += ` — expired ${Math.abs(daysLeft)} day${Math.abs(daysLeft) === 1 ? '' : 's'} ago`;
    }
  }

  return (
    `👤 *Customer:* ${customer.name}\n` +
    `🆔 *ID:* ${customer.customerId || 'N/A'}\n\n` +
    `📦 *Package:* ${customer.package || 'N/A'}\n` +
    `💰 *Monthly Fee:* Rs. ${Number(monthlyFee || customer.monthlyFee || 0).toLocaleString()}\n\n` +
    `📅 *Activation:* ${activation}\n` +
    `📅 *Expiry:* ${expiry}\n` +
    `${statusLine}\n\n` +
    `_If any details look wrong, please contact support._`
  );
}

function fallback() {
  return (
    `🤖 Sorry, I didn't understand that.\n\n` +
    `Reply *help* to see what I can do.`
  );
}

module.exports = {
  greeting,
  helpMenu,
  packagesList,
  askForCustomerId,
  customerNotFound,
  expiryDetails,
  fallback,
  formatDate,
  daysBetween,
};