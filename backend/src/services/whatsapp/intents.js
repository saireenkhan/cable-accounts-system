/**
 * Keyword-based intent detection.
 * Returns an intent string based on the incoming message body.
 *
 * Supported intents:
 *   - greeting
 *   - packages
 *   - expiry_ask_id
 *   - help
 *   - customer_id   (when user sends something that looks like a Customer ID)
 *   - fallback
 */

// Keywords for each intent (all matched lowercase).
const KEYWORDS = {
  greeting: ['hi', 'hello', 'hey', 'salam', 'assalam', 'assalamualaikum', 'start', 'aoa'],
  packages: ['packages', 'package', 'plans', 'plan', 'rates', 'rate', 'pricing'],
  expiry_ask_id: ['expiry', 'expire', 'expired', 'due', 'bill', 'renew', 'renewal'],
  help: ['help', 'menu', 'commands', 'options'],
};

/**
 * Normalize the raw message for matching.
 */
function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // strip punctuation except dashes
    .replace(/\s+/g, ' ');
}

/**
 * Check if the string looks like a Customer ID.
 * Matches formats like: Na01, Na123, AB12, XYZ1234
 * (letters followed by 2-4 digits, optional dash/space)
 */
function looksLikeCustomerId(text) {
  const t = String(text || '').trim().replace(/[\s-]/g, '');
  return /^[a-z]{1,4}\d{2,4}$/i.test(t);
}

/**
 * Detect the intent of a message.
 * @param {string} text - raw incoming message
 * @param {string} sessionState - current session state ('idle' | 'awaiting_customer_id')
 * @returns {string} intent name
 */
function detectIntent(text, sessionState = 'idle') {
  const msg = normalize(text);
  if (!msg) return 'fallback';

  // If we're waiting for a customer ID, treat any reply as an attempt.
  if (sessionState === 'awaiting_customer_id') {
    if (looksLikeCustomerId(text)) return 'customer_id';
    // If they typed a keyword instead, let normal routing take over.
  }

  // Exact single-word keyword match
  for (const [intent, words] of Object.entries(KEYWORDS)) {
    if (words.includes(msg)) return intent;
  }

  // Greeting phrases like "hi there", "hello sir"
  const firstWord = msg.split(' ')[0];
  if (KEYWORDS.greeting.includes(firstWord)) return 'greeting';

  // Packages variants like "show packages", "what are the packages"
  if (KEYWORDS.packages.some((w) => msg.includes(w))) return 'packages';

  // Expiry variants
  if (KEYWORDS.expiry_ask_id.some((w) => msg.includes(w))) return 'expiry_ask_id';

  // Standalone customer ID without prior context (uncommon but possible)
  if (looksLikeCustomerId(text)) return 'customer_id';

  return 'fallback';
}

module.exports = {
  detectIntent,
  looksLikeCustomerId,
  normalize,
};