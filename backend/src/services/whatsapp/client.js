const axios = require('axios');

const API_VERSION = process.env.WHATSAPP_API_VERSION || 'v21.0';
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

const GRAPH_URL = `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}/messages`;

/**
 * Send a plain text WhatsApp message.
 * @param {string} to - recipient phone in E.164 format without '+', e.g. "923472234500"
 * @param {string} body - message text
 */
async function sendText(to, body) {
  if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
    throw new Error(
      'WhatsApp client not configured: missing PHONE_NUMBER_ID or ACCESS_TOKEN'
    );
  }

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'text',
    text: {
      preview_url: false,
      body,
    },
  };

  try {
    const { data } = await axios.post(GRAPH_URL, payload, {
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });
    return { success: true, data };
  } catch (err) {
    const metaError = err.response?.data?.error;
    console.error('❌ [WhatsApp] Send failed:', metaError || err.message);
    return {
      success: false,
      error: metaError?.message || err.message,
    };
  }
}

/**
 * Mark an incoming message as read (optional nicety).
 */
async function markAsRead(messageId) {
  if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) return;
  try {
    await axios.post(
      GRAPH_URL,
      {
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId,
      },
      {
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        timeout: 5000,
      }
    );
  } catch (err) {
    // not critical — swallow
  }
}

module.exports = { sendText, markAsRead };