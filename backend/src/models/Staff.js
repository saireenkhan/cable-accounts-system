const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema({
  staffId: {
    type: String,
    unique: true,
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  phone: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
  },
  cnic: {
    type: String,
    trim: true,
  },
  designation: {
    type: String,
    enum: ['Collector', 'Technician', 'Installer', 'Sales Executive', 'Manager', 'Other'],
    required: true,
  },
  salary: {
    type: Number,
  },
  joiningDate: {
    type: Date,
    default: Date.now,
  },
  address: {
    type: String,
    trim: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  assignedArea: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Area',
  },
  remarks: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Staff', staffSchema);