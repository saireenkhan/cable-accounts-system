const crypto = require('crypto');

/**
 * Verify Meta's X-Hub-Signature-256 header.
 * Meta signs the raw body with the App Secret using HMAC-SHA256.
 *
 * IMPORTANT: This requires access to the RAW request body (not parsed JSON),
 * so it works with express.raw() or a body-capture middleware.
 *
 * If you're on Vercel with a standard express.json() setup, this check may
 * fail because the body has already been parsed. In that case, skip this
 * middleware initially and add it later when you can capture the raw body.
 */
function verifyMetaSignature(req, res, next) {
  try {
    const appSecret = process.env.WHATSAPP_APP_SECRET;
    if (!appSecret) {
      // No secret configured — skip in dev.
      return next();
    }

    const signature = req.headers['x-hub-signature-256'];
    if (!signature) {
      console.warn('⚠️ [WhatsApp] Missing signature header');
      return res.sendStatus(403);
    }

    const rawBody = req.rawBody || (req.body && JSON.stringify(req.body));
    if (!rawBody) {
      return res.sendStatus(403);
    }

    const expected =
      'sha256=' +
      crypto
        .createHmac('sha256', appSecret)
        .update(rawBody, 'utf8')
        .digest('hex');

    const a = Buffer.from(signature);
    const b = Buffer.from(expected);

    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      console.warn('⚠️ [WhatsApp] Signature mismatch');
      return res.sendStatus(403);
    }

    next();
  } catch (err) {
    console.error('❌ [WhatsApp] Signature verify error:', err);
    return res.sendStatus(403);
  }
}

module.exports = verifyMetaSignature;
