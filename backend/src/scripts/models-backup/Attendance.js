const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['Present', 'Absent', 'Leave', 'Half Day'],
      required: true,
    },
    checkIn: {
      type: String,
      default: '',
    },
    checkOut: {
      type: String,
      default: '',
    },
    remarks: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// ✅ Ensure only one attendance record per staff per day
attendanceSchema.index({ staffId: 1, date: 1 }, { unique: true });

// ✅ Helper: strip time from a date (returns midnight UTC)
attendanceSchema.statics.normalizeDate = function (dateInput) {
  const d = new Date(dateInput);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

module.exports = mongoose.model('Attendance', attendanceSchema);