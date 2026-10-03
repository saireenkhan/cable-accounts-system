const mongoose = require('mongoose');

const dealerAreaSchema = new mongoose.Schema(
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
      default: '',
    },

    description: {
      type: String,
      trim: true,
      default: '',
    },

    // Multiple ISPs can belong to one dealer area.
    // ISP names are stored as strings.
    isp: {
      type: [String],
      default: [],
      set: (value) => {
        if (!value) return [];

        if (!Array.isArray(value)) {
          value = [value];
        }

        return [
          ...new Set(
            value
              .map((item) => String(item).trim())
              .filter(Boolean)
          ),
        ];
      },
    },

    dealers: {
      type: Number,
      default: 0,
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

dealerAreaSchema.index(
  { tenantId: 1, name: 1 },
  { unique: true }
);

module.exports = mongoose.model(
  'DealerArea',
  dealerAreaSchema
);