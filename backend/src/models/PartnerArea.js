const mongoose = require('mongoose');

const partnerAreaSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: false,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    code: {
      type: String,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
    },

    // One partner area can belong to multiple ISPs.
    // ISP names are stored as strings.
    isp: {
      type: [String],
      default: [],

      set: (value) => {
        if (!value) return [];

        const values = Array.isArray(value)
          ? value
          : [value];

        return [
          ...new Set(
            values
              .map((item) => String(item).trim())
              .filter(Boolean)
          ),
        ];
      },
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

partnerAreaSchema.index(
  { tenantId: 1, name: 1 },
  { unique: true }
);

module.exports = mongoose.model(
  'PartnerArea',
  partnerAreaSchema
);