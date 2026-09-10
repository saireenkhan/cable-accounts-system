const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
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
  },
  checkOut: {
    type: String,
  },
  remarks: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true,
});

attendanceSchema.index({ staffId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);