const mongoose = require('mongoose');

const areaSchema = new mongoose.Schema(
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

    // Multiple ISPs can now be assigned to one area
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

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

areaSchema.index(
  { tenantId: 1, name: 1 },
  { unique: true }
);

module.exports = mongoose.model('Area', areaSchema);