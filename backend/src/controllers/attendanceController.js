const Attendance = require('../models/Attendance');
const Staff = require('../models/Staff');
const logger = require('../utils/logger');

// ============================================================
// ✅ GET ATTENDANCE (single day OR filter by staffId)
// GET /api/attendance?date=YYYY-MM-DD&staffId=ST-001
// ============================================================
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

    if (staffId) {
      // staffId can be a string staffId like "ST-001" or an ObjectId
      const staff = await Staff.findOne({ staffId });
      if (staff) {
        filter.staffId = staff._id;
      } else {
        // try as ObjectId
        try {
          filter.staffId = staffId;
        } catch (e) {
          // ignore
        }
      }
    }

    const attendance = await Attendance.find(filter)
      .populate({
        path: 'staffId',
        populate: {
          path: 'assignedArea',
          select: 'name',
        },
      })
      .sort({ date: -1 });

    res.json({ success: true, attendance });
  } catch (error) {
    logger.error(`Get attendance error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ============================================================
// ✅ MARK ATTENDANCE
// POST /api/attendance
// Body: { staffId, date, status, checkIn, checkOut, remarks }
// ============================================================
exports.markAttendance = async (req, res) => {
  try {
    const { staffId, date, status, checkIn, checkOut, remarks } = req.body;

    console.log('📝 Marking attendance with data:', req.body);

    if (!staffId || !date || !status) {
      return res.status(400).json({
        success: false,
        message: 'staffId, date and status are required',
      });
    }

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
        message: `Staff with ID "${staffId}" not found`,
      });
    }

    // ✅ Normalize the date to midnight so unique index works correctly
    const normalizedDate = Attendance.normalizeDate(date);

    // Check if attendance already exists for this staff and date
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    const existing = await Attendance.findOne({
      staffId: staff._id,
      date: { $gte: startDate, $lte: endDate },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Attendance already marked for this date',
      });
    }

    const attendance = await Attendance.create({
      staffId: staff._id,
      date: normalizedDate,
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
          select: 'name',
        },
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

// ============================================================
// ✅ UPDATE ATTENDANCE
// PUT /api/attendance/:id
// ============================================================
exports.updateAttendance = async (req, res) => {
  try {
    const updates = { ...req.body };

    // Normalize date if provided
    if (updates.date) {
      updates.date = Attendance.normalizeDate(updates.date);
    }

    const attendance = await Attendance.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).populate({
      path: 'staffId',
      populate: {
        path: 'assignedArea',
        select: 'name',
      },
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found',
      });
    }

    res.json({ success: true, attendance });
  } catch (error) {
    logger.error(`Update attendance error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ============================================================
// ✅ DELETE ATTENDANCE
// DELETE /api/attendance/:id
// ============================================================
exports.deleteAttendance = async (req, res) => {
  try {
    const attendance = await Attendance.findByIdAndDelete(req.params.id);

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found',
      });
    }

    res.json({ success: true, message: 'Attendance deleted' });
  } catch (error) {
    logger.error(`Delete attendance error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ============================================================
// ✅ MONTHLY REPORT (school-style register)
// GET /api/attendance/monthly?month=YYYY-MM
//
// Returns per-staff day-by-day status + summary counts + %.
// ============================================================
exports.getMonthlyReport = async (req, res) => {
  try {
    const { month } = req.query; // e.g. "2026-09"

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid month format. Use YYYY-MM',
      });
    }

    const [yearStr, monthStr] = month.split('-');
    const year = parseInt(yearStr);
    const monthIndex = parseInt(monthStr) - 1; // 0-11

    // First and last moment of the month
    const startDate = new Date(year, monthIndex, 1, 0, 0, 0, 0);
    const endDate = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);

    const daysInMonth = endDate.getDate();

    // Fetch all attendance records for the month
    const records = await Attendance.find({
      date: { $gte: startDate, $lte: endDate },
    })
      .populate({
        path: 'staffId',
        populate: { path: 'assignedArea', select: 'name' },
      })
      .sort({ date: 1 });

    // Fetch ALL staff (so staff with zero attendance still appear)
    const allStaff = await Staff.find({})
      .populate({ path: 'assignedArea', select: 'name' })
      .sort({ staffId: 1 });

    // Build per-staff day-by-day map
    const staffMap = {};

    allStaff.forEach((s) => {
      staffMap[s._id.toString()] = {
        staffObjectId: s._id.toString(),
        staffId: s.staffId || 'N/A',
        name: s.name || 'Unknown',
        designation: s.designation || 'N/A',
        area: s.assignedArea?.name || 'N/A',
        days: {}, // { '1': 'Present', '2': 'Absent', ... }
        present: 0,
        absent: 0,
        leave: 0,
        halfDay: 0,
        totalMarked: 0,
      };
    });

    records.forEach((r) => {
      const sid = r.staffId?._id?.toString();
      if (!sid || !staffMap[sid]) return;

      const day = new Date(r.date).getUTCDate();
      staffMap[sid].days[day] = r.status;
      staffMap[sid].totalMarked += 1;

      if (r.status === 'Present') staffMap[sid].present += 1;
      else if (r.status === 'Absent') staffMap[sid].absent += 1;
      else if (r.status === 'Leave') staffMap[sid].leave += 1;
      else if (r.status === 'Half Day') staffMap[sid].halfDay += 1;
    });

    // Compute attendance percentage per staff
    // % = (present + halfDay*0.5) / daysInMonth * 100
    const staffReports = Object.values(staffMap).map((s) => {
      const effectivePresent = s.present + s.halfDay * 0.5;
      const percentage =
        daysInMonth > 0
          ? Math.round((effectivePresent / daysInMonth) * 100)
          : 0;

      return {
        ...s,
        daysInMonth,
        percentage,
      };
    });

    // Month-level totals
    const totals = staffReports.reduce(
      (acc, s) => {
        acc.present += s.present;
        acc.absent += s.absent;
        acc.leave += s.leave;
        acc.halfDay += s.halfDay;
        return acc;
      },
      { present: 0, absent: 0, leave: 0, halfDay: 0 }
    );

    res.json({
      success: true,
      month,
      year,
      monthIndex,
      monthName: new Date(year, monthIndex, 1).toLocaleString('en-US', {
        month: 'long',
      }),
      daysInMonth,
      totalStaff: allStaff.length,
      staffReports,
      totals,
    });
  } catch (error) {
    logger.error(`Monthly attendance error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};