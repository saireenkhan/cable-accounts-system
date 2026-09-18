const express = require('express');
const router = express.Router();
const whatsappController = require('../controllers/whatsappController');

/**
 * Webhook endpoints (called by Meta).
 *
 * Meta uses:
 *   GET  /api/whatsapp/webhook   → one-time verification handshake
 *   POST /api/whatsapp/webhook   → incoming messages
 */
router.get('/webhook', whatsappController.verifyWebhook);
router.post('/webhook', whatsappController.receiveWebhook);

/**
 * Admin endpoints (called by the frontend).
 */
router.get('/config', whatsappController.getConfig);
router.put('/config', whatsappController.updateConfig);
router.get('/messages', whatsappController.getMessages);

module.exports = router;