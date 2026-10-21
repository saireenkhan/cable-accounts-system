
const mongoose = require("mongoose");

const masterPackageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    description: { type: String, default: "" },
    monthlyPrice: { type: Number, default: 0, min: 0 },
    allowedPages: {
      type: [String],
      default: [],
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("MasterPackage", masterPackageSchema);
