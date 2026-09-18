const WhatsAppSession = require('../models/WhatsAppSession');
const WhatsAppMessage = require('../models/WhatsAppMessage');
const WhatsAppConfig = require('../models/WhatsAppConfig');
const { detectIntent } = require('../services/whatsapp/intents');
const handlers = require('../services/whatsapp/handlers');

/**
 * GET /api/whatsapp/webhook
 * Meta's verification handshake.
 */
async function verifyWebhook(req, res) {
  try {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const expectedToken =
      process.env.WHATSAPP_VERIFY_TOKEN || 'smart_recovery_verify';

    if (mode === 'subscribe' && token === expectedToken) {
      console.log('✅ [WhatsApp] Webhook verified');
      return res.status(200).send(challenge);
    }

    console.warn('⚠️ [WhatsApp] Webhook verification failed', { mode, token });
    return res.sendStatus(403);
  } catch (err) {
    console.error('❌ [WhatsApp] Verify error:', err);
    return res.sendStatus(500);
  }
}

/**
 * POST /api/whatsapp/webhook
 * Receives incoming message events from Meta.
 *
 * IMPORTANT: We await all DB + WhatsApp work BEFORE responding.
 * On Vercel serverless, sending the response first can terminate the
 * function before the async work finishes.
 */
async function receiveWebhook(req, res) {
  try {
    const body = req.body;

    const entry = body?.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const message = value?.messages?.[0];

    if (!message) {
      // Status update (delivered/read) — ignore, respond OK.
      return res.status(200).send('EVENT_RECEIVED');
    }

    const from = message.from;
    const text =
      message.text?.body ||
      message.button?.text ||
      message.interactive?.button_reply?.title ||
      '';
    const waMessageId = message.id;

    console.log(`📥 [WhatsApp] Incoming from ${from}: "${text}"`);

    // Deduplicate.
    if (waMessageId) {
      const existing = await WhatsAppMessage.findOne({ waMessageId });
      if (existing) {
        console.log(`♻️ [WhatsApp] Duplicate ${waMessageId} skipped`);
        return res.status(200).send('EVENT_RECEIVED');
      }
    }

    // Load or create session.
    let session = await WhatsAppSession.findOne({ phone: from });
    if (!session) {
      session = await WhatsAppSession.create({ phone: from });
    }

    // Log incoming.
    await WhatsAppMessage.create({
      phone: from,
      direction: 'in',
      body: text,
      waMessageId,
      status: 'received',
    });

    // Detect intent.
    const intent = detectIntent(text, session.state);
    console.log(`🧠 [WhatsApp] Intent: ${intent} (state: ${session.state})`);

    // Route.
    let result;
    switch (intent) {
      case 'packages':
        result = await handlers.handlePackages(from);
        session.state = 'idle';
        break;

      case 'expiry_ask_id':
        result = await handlers.handleExpiryAskId(from);
        session.state = 'awaiting_customer_id';
        break;

      case 'customer_id':
        result = await handlers.handleCustomerId(from, text, {
          requirePhoneMatch: true,
        });
        session.state = 'idle';
        break;

      case 'greeting':
        result = await handlers.handleGreeting(from);
        session.state = 'idle';
        break;

      case 'help':
        result = await handlers.handleHelp(from);
        session.state = 'idle';
        break;

      case 'fallback':
      default:
        result = await handlers.handleFallback(from);
        break;
    }

    session.lastIntent = result.intent;
    session.lastMessageAt = new Date();
    await session.save();

    // Log outgoing.
    await WhatsAppMessage.create({
      phone: from,
      direction: 'out',
      body: result.reply || '',
      intent: result.intent,
      customerId: result.customerId || null,
      status: 'sent',
    });

    console.log(`📤 [WhatsApp] Replied to ${from} (intent: ${result.intent})`);

    // ✅ Respond AFTER all work is done.
    return res.status(200).send('EVENT_RECEIVED');
  } catch (err) {
    console.error('❌ [WhatsApp] Handler error:', err);
    // Always respond 200 so Meta doesn't retry forever.
    return res.status(200).send('EVENT_RECEIVED');
  }
}

/**
 * GET /api/whatsapp/config
 */
async function getConfig(req, res) {
  try {
    let config = await WhatsAppConfig.findOne({ singletonKey: 'default' });
    if (!config) {
      config = await WhatsAppConfig.create({ singletonKey: 'default' });
    }
    res.json({ success: true, config });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * PUT /api/whatsapp/config
 */
async function updateConfig(req, res) {
  try {
    const updates = req.body || {};
    const config = await WhatsAppConfig.findOneAndUpdate(
      { singletonKey: 'default' },
      { $set: updates },
      { new: true, upsert: true }
    );
    res.json({ success: true, config });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * GET /api/whatsapp/messages
 */
async function getMessages(req, res) {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const phone = req.query.phone;
    const query = phone ? { phone } : {};

    const messages = await WhatsAppMessage.find(query)
      .sort({ createdAt: -1 })
      .limit(limit);

    res.json({ success: true, messages });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = {
  verifyWebhook,
  receiveWebhook,
  getConfig,
  updateConfig,
  getMessages,
};