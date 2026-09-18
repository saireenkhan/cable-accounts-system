const mongoose = require('mongoose');

const whatsappConfigSchema = new mongoose.Schema(
  {
    // Only one config document should exist; we use this as a singleton.
    singletonKey: {
      type: String,
      default: 'default',
      unique: true,
    },

    // Meta credentials
    phoneNumberId: { type: String, default: '' },
    businessAccountId: { type: String, default: '' },
    accessToken: { type: String, default: '' },
    verifyToken: { type: String, default: '' },
    appSecret: { type: String, default: '' },
    apiVersion: { type: String, default: 'v21.0' },

    // Feature toggles
    isActive: { type: Boolean, default: true },
    autoReplyEnabled: { type: Boolean, default: true },
    expiryLookupRequiresPhoneMatch: { type: Boolean, default: true },

    // Customizable text messages
    greetingMessage: {
      type: String,
      default:
        '👋 Welcome to Smart Recovery!\n\n' +
        'Reply with:\n' +
        '• *packages* — to see all available packages\n' +
        '• *expiry* — to check your subscription expiry\n' +
        '• *help* — to see this menu again',
    },
    helpMessage: {
      type: String,
      default:
        '📋 *Menu*\n\n' +
        '• *packages* — see all available packages\n' +
        '• *expiry* — check your subscription expiry\n' +
        '• *help* — show this menu',
    },
    fallbackMessage: {
      type: String,
      default:
        "🤖 Sorry, I didn't understand that.\n\n" +
        'Reply *help* to see what I can do.',
    },
    expiryAskIdMessage: {
      type: String,
      default:
        '🔎 Please send your *Customer ID* to check your expiry.\n' +
        'Example: *CUS-0012*',
    },
    expiryNotFoundMessage: {
      type: String,
      default:
        "❌ We couldn't find this ID linked to your WhatsApp number.\n" +
        'Please contact support.',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('WhatsAppConfig', whatsappConfigSchema);