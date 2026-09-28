const WhatsAppSession = require('../models/WhatsAppSession');
const WhatsAppMessage = require('../models/WhatsAppMessage');
const WhatsAppConfig = require('../models/WhatsAppConfig');
const Customer = require('../models/Customer');
const { detectIntent } = require('../services/whatsapp/intents');
const handlers = require('../services/whatsapp/handlers');

/**
 * GET /api/whatsapp/webhook
 * Meta's verification handshake — NO auth, NO tenant.
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
 * Receives incoming messages from Meta. No auth — Meta calls it.
 *
 * Tenant resolution: we look up the WhatsAppConfig that has a matching
 * phoneNumberId from the incoming payload. That tells us which tenant
 * this message belongs to.
 */
async function receiveWebhook(req, res) {
  try {
    const body = req.body;

    const entry = body?.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const message = value?.messages?.[0];

    if (!message) {
      return res.status(200).send('EVENT_RECEIVED');
    }

    const from = message.from;
    const text =
      message.text?.body ||
      message.button?.text ||
      message.interactive?.button_reply?.title ||
      '';
    const waMessageId = message.id;

    // Try to resolve the tenant by the phoneNumberId in the payload.
    const phoneNumberId = value?.metadata?.phone_number_id;
    let tenantId = null;

    if (phoneNumberId) {
      const cfg = await WhatsAppConfig.findOne({ phoneNumberId }).lean();
      if (cfg?.tenantId) tenantId = cfg.tenantId;
    }

    // Fallback: if there's exactly ONE config, use its tenant.
    if (!tenantId) {
      const all = await WhatsAppConfig.find({}, { tenantId: 1 }).lean();
      if (all.length === 1) tenantId = all[0].tenantId;
    }

    console.log(
      `📥 [WhatsApp] Incoming from ${from}: "${text}" (tenant: ${tenantId || 'unresolved'})`
    );

    // Deduplicate — scope check by tenantId when known.
    if (waMessageId) {
      const dupQuery = tenantId
        ? { waMessageId, tenantId }
        : { waMessageId };
      const existing = await WhatsAppMessage.findOne(dupQuery);
      if (existing) {
        console.log(`♻️ [WhatsApp] Duplicate ${waMessageId} skipped`);
        return res.status(200).send('EVENT_RECEIVED');
      }
    }

    // Load or create session — scope by tenant if known.
    const sessionQuery = tenantId ? { phone: from, tenantId } : { phone: from };
    let session = await WhatsAppSession.findOne(sessionQuery);
    if (!session) {
      session = await WhatsAppSession.create({
        phone: from,
        tenantId: tenantId || null,
      });
    }

    // Log incoming.
    await WhatsAppMessage.create({
      phone: from,
      direction: 'in',
      body: text,
      waMessageId,
      status: 'received',
      tenantId: tenantId || null,
    });

    // Detect intent.
    const intent = detectIntent(text, session.state);
    console.log(`🧠 [WhatsApp] Intent: ${intent} (state: ${session.state})`);

    // Route.
    let result;
    switch (intent) {
      case 'packages':
        result = await handlers.handlePackages(from, tenantId);
        session.state = 'idle';
        break;

      case 'expiry_ask_id':
        result = await handlers.handleExpiryAskId(from, tenantId);
        session.state = 'awaiting_customer_id';
        break;

      case 'customer_id':
        result = await handlers.handleCustomerId(from, text, {
          requirePhoneMatch: true,
          tenantId,
        });
        session.state = 'idle';
        break;

      case 'greeting':
        result = await handlers.handleGreeting(from, tenantId);
        session.state = 'idle';
        break;

      case 'help':
        result = await handlers.handleHelp(from, tenantId);
        session.state = 'idle';
        break;

      case 'fallback':
      default:
        result = await handlers.handleFallback(from, tenantId);
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
      tenantId: tenantId || null,
    });

    console.log(`📤 [WhatsApp] Replied to ${from} (intent: ${result.intent})`);

    return res.status(200).send('EVENT_RECEIVED');
  } catch (err) {
    console.error('❌ [WhatsApp] Handler error:', err);
    return res.status(200).send('EVENT_RECEIVED');
  }
}

/**
 * GET /api/whatsapp/config
 * Admin endpoint — requires auth. Each tenant gets its own config.
 */
async function getConfig(req, res) {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      return res
        .status(400)
        .json({ success: false, message: 'Tenant not found' });
    }

    let config = await WhatsAppConfig.findOne({ tenantId });
    if (!config) {
      config = await WhatsAppConfig.create({
        tenantId,
        singletonKey: `default-${tenantId}`,
      });
    }
    res.json({ success: true, config });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * PUT /api/whatsapp/config
 * Admin endpoint — requires auth.
 */
async function updateConfig(req, res) {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      return res
        .status(400)
        .json({ success: false, message: 'Tenant not found' });
    }

    const updates = req.body || {};

    const config = await WhatsAppConfig.findOneAndUpdate(
      { tenantId },
      {
        $set: updates,
        $setOnInsert: {
          tenantId,
          singletonKey: `default-${tenantId}`,
        },
      },
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
 * Admin endpoint — requires auth. Scoped to tenant.
 */
async function getMessages(req, res) {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      return res
        .status(400)
        .json({ success: false, message: 'Tenant not found' });
    }

    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const phone = req.query.phone;

    const query = { tenantId };
    if (phone) query.phone = phone;

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