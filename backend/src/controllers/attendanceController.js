const Attendance = require('../models/Attendance');
const Staff = require('../models/Staff');
const logger = require('../utils/logger');

exports.getAttendance = async (req, res) => {
  try {
    const { date, staffId } = req.query;
    const filter = {};
    
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      filter.date = { $gte: startDate, $lte: endDate };
    }
    if (staffId) filter.staffId = staffId;

    const attendance = await Attendance.find(filter)
      .populate({
        path: 'staffId',
        populate: {
          path: 'assignedArea',
          select: 'name'
        }
      })
      .sort({ date: -1 });

    res.json({ success: true, attendance });
  } catch (error) {
    logger.error(`Get attendance error: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.markAttendance = async (req, res) => {
  try {
    const { staffId, date, status, checkIn, checkOut, remarks } = req.body;

    console.log('📝 Marking attendance with data:', req.body);

    // ✅ Find staff by staffId string (e.g., 'ST-001')
    let staff = await Staff.findOne({ staffId: staffId });
    
    if (!staff) {
      // Try to find by _id if it's an ObjectId
      try {
        staff = await Staff.findById(staffId);
      } catch (e) {
        // ignore
      }
    }
    
    if (!staff) {
      return res.status(404).json({ 
        success: false,
        message: `Staff with ID "${staffId}" not found` 
      });
    }

    // Check if attendance already exists for this staff and date
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    const existing = await Attendance.findOne({
      staffId: staff._id,
      date: { $gte: startDate, $lte: endDate }
    });
    
    if (existing) {
      return res.status(400).json({ 
        success: false,
        message: 'Attendance already marked for this date' 
      });
    }

    const attendance = await Attendance.create({
      staffId: staff._id,
      date: new Date(date),
      status,
      checkIn: checkIn || '',
      checkOut: checkOut || '',
      remarks: remarks || '',
    });

    const populatedAttendance = await Attendance.findById(attendance._id)
      .populate({
        path: 'staffId',
        populate: {
          path: 'assignedArea',
          select: 'name'
        }
      });

    console.log('✅ Attendance marked successfully');

    res.status(201).json({
      success: true,
      attendance: populatedAttendance,
      message: 'Attendance marked successfully',
    });
  } catch (error) {
    console.error('❌ Mark attendance error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message || 'Server error',
    });
  }
};

exports.updateAttendance = async (req, res) => {
  try {
    const attendance = await Attendance.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!attendance) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }
    
    res.json({ success: true, attendance });
  } catch (error) {
    logger.error(`Update attendance error: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};